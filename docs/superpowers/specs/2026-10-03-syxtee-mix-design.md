# SYXTEE MIX : design

Date : 2026-10-03. Statut : spec à relire, avant plan d'implémentation.

## Nom et place dans le produit

Décisions du 2026-10-03 : **SYXTEE STUDIO devient SYXTEE MIX** (nom plus évident), et **le plugin SYXTEE Link est abandonné**. SYXTEE Mix n'est plus une télécommande d'OBS : c'est un mixeur multi-caméras natif sur le site, qui sort un seul flux RTMP pour OBS. La page `/mix` affiche donc **uniquement le mixeur** (plus d'onglet « Piloter OBS »). Le code de l'ancien pilotage d'OBS (`src/components/studio/Studio.tsx`, `Connect`, `LinkApprove`, `useLink`, page `/link`, dossier `link/`, côté Core `remote`, `backups`) n'est plus branché à `/mix` ; sa suppression se fait dans un lot de nettoyage séparé, pas dans ce chantier. Adresses : `/mix` (l'app) et `/syxtee-mix` (la présentation) ; `/studio` et `/syxtee-studio` redirigent (308). Les identifiants internes (composants, `core/src/studio.ts`, routes `/v1/me/studio/*`) gardent leur nom.

## Objectif

Un compte voit **toutes ses caméras (relais) en même temps**, comme un multiview natif, et les mixe depuis une page du dashboard : il choisit les scènes et règle l'audio de **chaque source**. Il colle ensuite **une seule adresse RTMP** dans OBS Studio : OBS reçoit déjà le mélange, il n'a plus à gérer chaque caméra.

Ce que l'utilisateur a validé :
- Le mixage se fait **dans le navigateur** (pas de CPU serveur significatif). Il faut garder la page Mix ouverte.
- Le pilote est un **PC avec une bonne connexion** (pas un téléphone en 4G).
- Interface : maquette validée (3 colonnes Sources, Programme, Audio, plus un bandeau « Pour OBS »). Elle sera améliorée ensuite (voir « Hors première version »).

## Hors première version (à améliorer ensuite)

- Sources audio hors caméras (micro, musique, média) : exclu, l'audio vient seulement des relais.
- Éditeur de scènes (choisir quelle caméra va dans quelle case, créer ses propres scènes). La V1 propose 4 scènes fixes.
- Sortie 1080p (la V1 est en 720p, 30 images par seconde).
- Version téléphone du pilotage.
- Sortie SRT pour OBS en plus du RTMP.
- Prévisualisation avant passage à l'antenne (preview / programme).
- Sauvegarde des scènes dans le compte (la V1 les garde dans le navigateur, comme les caméras DJI).

## Architecture

```
caméra ──► relais (SLS) ──SRT──► Core (ffmpeg, copie vidéo, son Opus) ──► MediaMTX ──WHEP──► navigateur (page Mix)
                                                                                             │ canvas + WebAudio
OBS ◄──RTMP── MediaMTX (mix/<clé>) ◄── Core (ffmpeg : H.264 + AAC) ◄── MediaMTX ◄──WHIP── navigateur
```

Trois blocs, chacun avec une seule responsabilité.

### 1. Passerelle des sources (Core, `core/src/mix.ts`)

- Une session Mix par compte. Le compte choisit au plus **4** relais parmi les siens, actifs et autorisés (compte non suspendu, formule avec Studio).
- Pour chaque source en direct, le Core lance un `ffmpeg` : lecture SRT du relais (`play_id`, côté serveur seulement), **vidéo H.264 copiée**, **son transcodé en Opus** (WebRTC ne lit pas l'AAC), publication vers un chemin MediaMTX `mixsrc_<hex 128 bits>`.
- Le `ffmpeg` d'une source ne tourne que pendant que la session Mix est ouverte et que le relais est en direct. Il s'arrête quand l'un des deux cesse.
- **H.265** : non lisible dans un navigateur. Le Core détecte le codec de la source et la marque `unsupported_codec` ; la page affiche « repasse cette caméra en H.264 ».
- Lecture côté navigateur : WHEP sur `mixsrc_…`, autorisée par un **jeton court** émis par le Core pour la session (durée de vie de la session). Le jeton est vérifié par l'authentification HTTP de MediaMTX. Un compte ne peut lire que ses propres sources.

### 2. Page Mix (navigateur, `src/app/(dashboard)/dashboard/mix` + `src/components/mix`)

- Composants :
  - `SourcesPanel` : liste des relais du compte, état, protocole, débit, case à cocher (max 4).
  - `ProgramCanvas` : canvas 1280x720 à 30 images par seconde, alimenté par un `<video>` caché par source (WHEP). Sortie via `canvas.captureStream(30)`.
  - `SceneBar` : 4 scènes fixes en V1 (plein écran, incrustation, côte à côte, grille de 4) et le choix Coupure ou Fondu.
  - `AudioMixer` : l'audio est celui **des sources seulement** (le son de chaque caméra), pas de micro ni de média extérieur. Par source : volume, muet, solo, vumètre ; plus un volume général.
  - `ObsOutput` : URL RTMP du programme avec Copier et Régénérer.
- Logique pure et testable, séparée de l'interface :
  - `layouts.ts` : pour une scène et une liste de sources, calcule les rectangles (position, taille, ordre).
  - `scenes.ts` : état de la scène active, transition (coupure ou fondu, avec durée), fonction qui renvoie ce qu'il faut dessiner à l'instant `t`.
  - `audio-graph.ts` : gains par source (volume, muet, solo, général), calculés à partir de l'état.
- Le dessin utilise `requestAnimationFrame` et les `MediaStream` ; aucun état React ne change à chaque image (pas de `useState` pour des valeurs continues).
- Son : un `AudioContext`, une `MediaStreamAudioSourceNode` par source, un `GainNode` par source, un gain général, une `MediaStreamAudioDestinationNode`. La piste audio du programme est ajoutée au flux du canvas.
- Publication du programme : WHIP vers MediaMTX sur un chemin `mix_<hex>`, avec la même technique que SYXTEE Cam et le Studio actuel.
- `prefers-reduced-motion` : le fondu devient une coupure.
- Si une source tombe en cours de route, la case reste vide avec le nom de la caméra. Le mix ne s'arrête pas.

### 3. Sortie pour OBS (Core, même module)

- Le Core lit `mix_<hex>` (RTSP local), ré-encode une fois : H.264 (720p, débit constant 3000 à 4500 kb/s, images clés toutes les 2 s) et AAC 160 kb/s stéréo, puis publie en RTMP local vers MediaMTX sur `mix/<clé>`.
- OBS lit `rtmp://<hôte>:1935/mix/<clé>` (Source média). La clé est un secret de 128 bits, régénérable : régénérer coupe les lecteurs en cours.
- Autorisation MediaMTX : la lecture de `mix/<clé>` est acceptée seulement si la clé correspond à une session ouverte. Les IP bannies sont refusées.
- Pas de session ouverte, ou onglet Mix fermé : pas de flux. OBS affiche « en attente ».

## API du Core

Même modèle que `/v1/me/studio/*` (jeton de session Supabase) :

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/v1/me/mix/session` | Ouvre la session avec `sources: relay_id[]` (1 à 4). Renvoie les URL WHEP de chaque source, le jeton de lecture, l'URL WHIP du programme et l'URL RTMP pour OBS. Remplace la session précédente du compte. |
| GET | `/v1/me/mix/status` | État : sources (live, codec, débit), programme (en attente ou en direct), lecteurs OBS. |
| POST | `/v1/me/mix/sources` | Change la liste des sources sans fermer la session. |
| POST | `/v1/me/mix/rotate` | Régénère la clé RTMP de sortie. |
| DELETE | `/v1/me/mix/session` | Ferme la session et coupe les `ffmpeg`. |

Autorisation MediaMTX : le point d'entrée existant `/internal/mediamtx/auth` route aussi les chemins `mixsrc_` (lecture WHEP avec jeton), `mix_` (publication WHIP du navigateur) et `mix/` (lecture RTMP d'OBS).

## Sécurité et limites

- **Droits** : réservé aux comptes qui ont déjà Studio (même contrôle `allowed` que `studio.ts`). Une session Mix par compte.
- **Isolement** : un compte ne choisit que ses propres relais. Les `play_id` ne quittent jamais le Core.
- **Secrets** : chemins et clés de 128 bits, jamais écrits dans les journaux (`rtmp://***`), retirés à la fermeture. La session expire si personne ne publie en 10 minutes, comme le Studio.
- **Ressources** : 4 sources au plus par compte. Chaque source coûte peu (copie vidéo, Opus), le programme coûte un encodage x264 `veryfast` 720p. Un plafond de **sessions Mix simultanées par serveur** est lu dans la configuration (valeur par défaut à fixer au plan, après mesure sur le VPS).
- **Connexion du pilote** : la page affiche l'avertissement « il faut une bonne connexion : N flux en descente et 1 en montée ». Elle affiche le débit descendant utilisé.
- **Latence** : attendue de l'ordre de 2 à 4 secondes de bout en bout. À valider en test réel ; ce n'est pas une garantie.

## Gestion des erreurs

| Situation | Comportement |
|---|---|
| Relais pas en direct | Source grisée, case vide dans le programme. |
| Caméra en H.265 | Source marquée non lisible, message « repasse en H.264 ». |
| Navigateur sans WebRTC ou sans `captureStream` | Message clair, session non ouverte. |
| Onglet fermé ou connexion coupée | La publication s'arrête, le Core ferme la session (même mécanisme que `studio.ts`). OBS affiche « en attente ». |
| Jeton de lecture expiré | La page redemande une session ; les sources reviennent sans action de l'utilisateur. |
| Core redémarré | Sessions perdues ; la page détecte l'arrêt via `status` et propose de rouvrir. |

## Tests

- **Core** (`core/test/mix.test.ts`) : arguments des `ffmpeg` de source et de sortie, autorisation MediaMTX (propriétaire seulement, jeton, clé RTMP), cycle de vie des sources (démarrage, arrêt, relais qui tombe), refus d'un relais d'un autre compte, plafond de 4 sources, rotation de clé, absence de secret dans les journaux.
- **Navigateur** : tests unitaires de `layouts.ts`, `scenes.ts` (transitions) et `audio-graph.ts` (muet, solo, volumes).
- **Test réel sur le VPS** : 2 caméras (par exemple un téléphone en SRTLA et une caméra en RTMP), ouvrir Mix, changer de scène, couper un son, lire dans OBS. Mesurer latence, CPU du Core et débit descendant du navigateur.

## Intégration au site

- Entrée « SYXTEE Mix » (déjà renommée) dans la barre latérale du dashboard, avec le même contrôle d'accès. La page `/mix` est le mixeur (plein écran, sans nav du site, comme l'actuel `(studio)/layout.tsx`).
- Page de documentation `/docs/mix` (à créer avec la fonction) (étapes, limites H.264, latence).
- Aucune annonce sur la page d'accueil tant que le test réel n'est pas fait.

## Questions ouvertes pour le plan

1. Plafond de sessions Mix simultanées par serveur (à mesurer).
2. Durée du jeton de lecture WHEP et mode de renouvellement.
3. Nettoyage de l'ancien pilotage d'OBS (Link) : quand le supprimer, et que faire des comptes déjà appairés.
