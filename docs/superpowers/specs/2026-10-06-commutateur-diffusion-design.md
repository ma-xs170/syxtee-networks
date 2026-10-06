# Commutateur : diffusion YouTube / Twitch / Kick et chat incrusté

Date : 2026-10-06. Statut : spec à relire, avant plan d'implémentation.

Complète `2026-10-03-syxtee-mix-design.md` (mixeur multi-caméras). Le Commutateur est aujourd'hui une maquette (`src/components/mix/MixApp.tsx`, tout simulé).

## Objectif

Depuis le Commutateur, diffuser le programme **directement** sur YouTube, Twitch et Kick, sans OBS, avec le chat des plateformes affiché en haut à gauche de l'image. Décisions validées :

- **Aucun réencodage vidéo côté serveur** : la vidéo est remuxée (`-c:v copy`). Le VPS (4 vCore, 8 Go) ne transcode pas.
- **Audio seul converti en AAC** : le navigateur envoie de l'Opus (WebRTC), les plateformes veulent de l'AAC. Coût CPU négligeable.
- **Chat dessiné dans le canvas du navigateur** : le navigateur compose déjà le programme et l'encode une seule fois. Le chat est donc aussi présent dans la sortie OBS, sauf si l'interrupteur est coupé.
- **Clés de diffusion collées à la main**, stockées chiffrées. Pas d'obtention automatique par OAuth en V1 (Kick n'a pas d'API de clé).
- Pilote PC, onglet du Commutateur ouvert pendant tout le direct.

## Dépendance : le Mix réel

La page est une maquette ; `mix_<hex>` (WHIP vers MediaMTX) n'existe pas. Deux lots :

- **Lot A** : pipeline Mix minimal (sources WHEP, canvas, audio, publication WHIP). Défini par la spec du 2026-10-03.
- **Lot B** : sorties plateformes et chat incrusté (ce document). Inutile sans le lot A.

## Architecture

```
navigateur : canvas (sources + chat) + audio ──WHIP──► MediaMTX  mix_<hex>
MediaMTX ──RTSP local──► Core : ffmpeg -c:v copy -c:a aac ──RTMP(S)──► YouTube
                                                       ├──► Twitch
                                                       └──► Kick
```

Un process `ffmpeg` par sortie active. Une sortie qui échoue n'arrête pas les autres.

### 1. Données (migration `0042_mix_outputs`)

Table `mix_outputs` : `id`, `user_id`, `platform` (`youtube|twitch|kick`), `url` (RTMP/RTMPS), `key_enc` (AES-GCM, même schéma que `chat_connections` avec `CHAT_TOKEN_KEY`), `enabled`, dates. Unique `(user_id, platform)`. RLS : le propriétaire seul. La clé n’est jamais renvoyée au navigateur après enregistrement (seulement un indice `••••` + 4 caractères) ; elle est déchiffrée pour le propriétaire seulement au Go live.

### 2. Core (`core/src/studio.ts`, existant, étendu)

Le module Studio fait déjà : session WHIP `stu_<hex>`, ffmpeg RTSP local vers RTMP, anti-SSRF, aucune clé dans les logs. On ajoute :

- mode `copy` (défaut) : un ffmpeg **par destination**, `-c:v copy -c:a aac -b:a 160k`. L'ancien mode `encode` (x264, un seul ffmpeg en tee) reste disponible comme repli si les images clés de Chrome sont trop espacées ;
- `PUT /v1/me/studio/destinations` : remplace la liste des destinations d'une session ouverte (mode `copy`) ; les ffmpeg des destinations retirées s'arrêtent, les nouvelles démarrent, les autres ne sont pas touchées ;
- `GET /v1/me/studio/status` : ajoute `outputs: [{ name, state: "connecting" | "live" | "retrying", error: "refused" | "unreachable" | "failed" | null }]`.

Le Core ne stocke aucune clé : le navigateur les envoie à l'ouverture de session, comme aujourd'hui. Le chiffrement en base est côté Next (`mix_outputs`, `CHAT_TOKEN_KEY`) ; une server action déchiffre pour le propriétaire seulement.

### 3. Page Commutateur

- Panneau « Diffusion » : une ligne par plateforme (URL, clé masquée, interrupteur Go live, pastille d'état, durée, débit, badge `copy`). Boutons « Tout lancer » et « Tout couper ».
- `--live` réservé à la pastille EN LIVE. Go live en rouge `--accent`. Mono pour les libellés techniques. Tokens du site, thèmes clair et sombre.
- Bloc « Chat sur l'image » : interrupteur, plateformes affichées, taille, opacité.

### 4. Chat incrusté (`src/components/mix/chat-overlay.ts`)

- Source : flux Multichat existant (`/api/chat/*`), derniers 8 messages des plateformes choisies.
- Fonction pure de mise en page (messages + largeur → lignes, coupure de texte, hauteur) testée sans canvas.
- Dessin dans la boucle `requestAnimationFrame` du `ProgramCanvas`, après les sources : fond translucide, pseudo coloré par plateforme, haut gauche. Aucun `useState` pour des valeurs par image.
- Réglages (activé, taille, opacité, plateformes) gardés dans le navigateur en V1.

## Risque à valider tôt : images clés

En copy, la fréquence des images clés vient du H.264 de Chrome. Twitch exige ≤ 2 s, YouTube ≤ 4 s. Mesurer au premier test réel. Repli : forcer une image clé périodique côté navigateur (`RTCRtpSender`, `scalabilityMode`) ; sinon réévaluer un réencodage léger, hors V1.

## Erreurs

- Clé ou URL refusée : ligne en `error`, message clair, autres sorties inchangées.
- Navigateur fermé ou réseau coupé : programme coupé, sorties coupées après 10 s.
- Core redémarré : sorties à `idle`, aucune relance automatique (évite de diffuser sans pilote).

## Tests

- Core : validation URL/clé, machine d'état, chiffrement aller-retour, arrêt sur coupure du programme.
- ffmpeg : vérifié à la main vers un serveur RTMP local.
- Chat : mise en page pure testée.
- Dernier : test réel sur une chaîne Twitch, YouTube, Kick.

## Hors V1

Clés automatiques par OAuth, bitrate adapté par plateforme, 1080p, chat différent par sortie, sortie sans onglet ouvert, SRT vers les plateformes.
