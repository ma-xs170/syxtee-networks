# SYXTEE Link

Plugin OBS (macOS, Windows à suivre) qui relie OBS à SYXTEE Studio.

- **Contrôle à distance** : SYXTEE Studio (sur le site, même depuis un téléphone) affiche l'interface d'OBS ; chaque bouton agit sur ton PC (live, enregistrement, scènes, sources, audio, transitions, secours automatique).
- **Sauvegarde des scènes** : collections de scènes avec leurs médias (scripts exclus), sur ton espace SYXTEE, **5 Go par compte**. Restauration sur n'importe quel PC, sans toucher aux collections existantes.
- Le live et le stream **tournent sur l'ordinateur** : la vidéo ne passe jamais par le serveur. Seuls des ordres, des niveaux audio et un aperçu réduit circulent.

```
téléphone / navigateur (Studio) ──WS──► Core ◄──WS (sortant)── agent (dans le plugin) ──obs-websocket local──► OBS
```

## Fonctionnement

Le plugin lance l'agent livré dans le même paquet quand OBS s'ouvre et le ferme avec lui (`plugin/syxtee-link.c`). Une couche C++/Qt (`plugin/qt/`, sans moc) ajoute le menu **SYXTEE** dans la barre d'OBS, à côté d'Aide, et la fenêtre **SYXTEE Studio** (onglets Direct, Collections, Réglages ; écran « Connecte ton compte » si l'OBS n'est pas relié). La fenêtre parle à l'agent local en HTTP sur `127.0.0.1:47831`, avec un jeton que le plugin génère à chaque lancement et passe à l'agent (`SYXTEE_LINK_IPC`). Le Qt utilisé à l'exécution est celui d'OBS.

L'agent (`src/`, Node, exécutable autonome) :

1. **Connexion** : au premier lancement, il ouvre `/link?code=…` sur le site. L'utilisateur, connecté à son compte (invité), confirme ; l'agent reçoit un jeton d'appareil (seule l'empreinte SHA-256 est stockée côté serveur).
2. **Proposition de sauvegarde** avant utilisation (boîte native sur macOS, sinon écran de la page locale).
3. **OBS** : lit les réglages du serveur WebSocket d'OBS (`plugin_config/obs-websocket/config.json`), sans rien demander. Le serveur WebSocket doit être activé (Outils, Paramètres du serveur WebSocket).
4. **Commandes** : liste blanche de méthodes OBS (scènes, flux, enregistrement, audio, transitions, lecture), appliquée par le Core **et** par l'agent. Pas de suppression de scène, pas de réglages, pas de commande arbitraire.

## Installer (macOS)

Installeur `SYXTEE-Link-<version>.pkg` : s'installe dans `~/Library/Application Support/obs-studio/plugins/syxtee-link.plugin`, sans mot de passe. Il n'est pas notarisé (pas de compte Apple Developer) : au premier lancement, clic droit sur le `.pkg`, Ouvrir. Puis ouvrir OBS.

Pour le distribuer depuis le site : copier le fichier sur le serveur sous `DATA_DIR/downloads/SYXTEE-Link-mac.pkg` (et `SYXTEE-Link-windows.exe`). Le Core le sert sur `/dl/`.

## Construire

```
npm install
npm test             # agent, sauvegardes (archive et restauration), page locale, bout en bout avec le Core
npm run plugin       # macOS : syxtee-link.plugin et SYXTEE-Link-<version>.pkg dans ~/syxtee-link-plugin
```

Prérequis : OBS installé et les en-têtes Qt (`brew install qt`). `npm run plugin` télécharge les en-têtes de l'API d'OBS (`OBS_TAG`), compile le module (universel arm64 et x86_64, symboles d'OBS résolus au chargement), construit l'agent (Node « single executable » de la machine de build) et signe ad hoc. Sur un Mac Intel, construire sur un Mac Intel pour que l'agent soit en x86_64.

**Windows** : le code du plugin gère déjà Windows (`CreateProcess`), mais le build n'est pas fait : `cl` avec les bibliothèques d'OBS (obs.lib, obs-frontend-api.lib) ou le gabarit `obs-plugintemplate` sur une machine Windows, et un agent construit avec `node --build-sea` sur Windows.

## Sécurité

- Appairage : code de 8 caractères, 10 minutes, approbation par le compte connecté et invité ; 10 démarrages par minute et par IP.
- Page locale : écoute 127.0.0.1 uniquement, en-tête `Host` contrôlé (anti DNS rebinding), jeton propre à chaque exécution pour toute requête.
- Archives : lecture stricte (noms de fichiers sûrs, tailles bornées), médias écrits sous `~/SYXTEE Link/Médias/<id>/` seulement.
- Configuration locale dans `~/.syxtee-link/config.json` (droits 600).
- Accès réservé aux comptes invités, comme les relais.

## Essayer la fenêtre sans OBS

`plugin/qt/test/ui-shot.cpp` ouvre la fenêtre contre un agent local et enregistre une capture par onglet (Qt de Homebrew, rendu hors écran).

```
SYXTEE_LINK_HOME=/tmp/h SYXTEE_LINK_PORT=47833 SYXTEE_LINK_IPC=<32 caractères hex ou plus> node --experimental-strip-types src/main.ts run &
QT_QPA_PLATFORM=offscreen ui-shot 47833 <jeton> <dossier>
```

## Installer le .pkg (macOS, signature ad hoc)

Sans compte Apple Developer, le `.pkg` n'est pas notarisé : clic droit sur le fichier, Ouvrir, Ouvrir quand même (ou Réglages Système > Confidentialité et sécurité > « Ouvrir quand même » juste après un premier refus). Il s'installe sans mot de passe dans `~/Library/Application Support/obs-studio/plugins`. Quitter puis rouvrir OBS : le menu **SYXTEE** apparaît dans la barre.
