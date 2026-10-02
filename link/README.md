# SYXTEE Link

Agent à installer sur le PC où tourne OBS Studio. Il pilote OBS en local (obs-websocket, intégré à OBS 28+) et se laisse commander depuis **SYXTEE Studio, onglet « Télécommande OBS »** : lancer le live, enregistrer, changer de scène, régler l'audio, backup de scène.

OBS diffuse lui-même depuis le PC. Le serveur SYXTEE ne voit **jamais la vidéo** : seuls des messages de contrôle (et les niveaux audio) passent par lui.

```
navigateur (Studio) ──WS──► Core ◄──WS (sortant)── SYXTEE Link (PC) ──obs-websocket local──► OBS
```

Aucun port à ouvrir sur le PC : la connexion part de l'agent.

## Utilisation

1. OBS : Outils, Paramètres du serveur WebSocket, activer (port 4455). Noter le mot de passe s'il y en a un.
2. SYXTEE Studio, onglet « Télécommande OBS » : « Générer un code ».
3. Sur le PC :

```
syxtee-link pair CODE
syxtee-link obs 127.0.0.1:4455 MOT_DE_PASSE     # seulement si OBS a un mot de passe
syxtee-link run
```

`syxtee-link unpair` oublie l'appairage. Un appareil se révoque aussi depuis le Studio.

## Backup de scène

Dans le Studio : choisir la source surveillée (celle qui lit le relais), la scène de secours (BRB) et le délai. Si l'image de la source reste figée (ou que la capture échoue) pendant ce délai, l'agent passe OBS sur la scène de secours, puis revient à la scène d'origine quand l'image repart. Si tu changes de scène à la main pendant le secours, l'agent ne touche à rien. Le réglage est enregistré sur le PC, donc le backup continue même navigateur fermé.

## Sécurité

- Appairage : code de 8 caractères, 5 minutes, usage unique, 10 essais ratés par minute et par IP. Le jeton d'appareil (`slk_…`) n'est stocké qu'en empreinte SHA-256 côté serveur.
- Le Core et l'agent n'acceptent qu'une liste blanche de commandes OBS (scènes, flux, enregistrement, audio, lecture). Pas de suppression de scène, pas de modification de paramètres, pas de commande arbitraire.
- Configuration locale dans `~/.syxtee-link/config.json` (droits 600) : jeton d'appareil et mot de passe OBS.
- Accès réservé aux comptes invités, comme les relais.

## Développement

```
npm install
npm test            # tests unitaires + bout en bout (Core réel, agent réel, faux OBS)
npm run dev -- run  # lance l'agent depuis les sources (Node 24+)
npm run sea         # exécutable autonome pour la plateforme courante (dist/)
```

Les exécutables macOS et Windows se construisent chacun sur leur système (modèle : `link/github-workflow.yml`, à copier dans `.github/workflows/`). Sous macOS, l'exécutable est signé ad hoc ; pour le distribuer au public, il faut le signer et le notariser avec un compte Apple Developer.
