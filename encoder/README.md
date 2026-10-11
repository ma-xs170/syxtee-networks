# SYXTEE Encodeur (agent)

Logiciel du boîtier SYXTEE Encodeur : capte la caméra, encode en H.264, envoie en SRT ou SRTLA (bonding de plusieurs connexions) vers le Core. Le même code tourne sur Mac (développement, sans boîtier) et sur le boîtier (RK3588).

```
caméra ─► GStreamer (encodeur) ─► MPEG-TS ─► SRT ─► [srtla_send répartit sur Wi-Fi / Ethernet / 4G] ─► Core
```

## Backends (`src/hardware.ts`)

| Backend | Caméra | Encodeur | État |
|---|---|---|---|
| `mac` | `avfvideosrc` | `vtenc_h264` (VideoToolbox) | pour développer sur Mac |
| `test` | `videotestsrc` (mire) | `x264enc` (logiciel) | tests et CI, sans caméra |
| `rk3588` | `v4l2src` (UVC MJPEG) | `mpph264enc` (Rockchip) | écrit, **non testé** sans le boîtier |

## Utiliser

```
brew install gstreamer srt          # Mac
npm install
npm run doctor                      # vérifie plugins, srtla_send, liens réseau
npm run dev -- start --url "srt://serveur:port?streamid=…" --backend test
npm test                            # unitaires + test réel mire -> SRT -> srt-live-transmit
```

L'URL d'envoi vient de `GET /v1/me/ingest` du Core (`srt_url` ou `srtla_url`). Avec `srtla://`, `srtla_send` doit être installé (à compiler depuis les sources de srtla) ; sinon utiliser `srt://` (une seule connexion).

## Interface locale

```
npm run dev -- serve                         # http://127.0.0.1:8080, sans PIN, uniquement en local
npm run dev -- serve --host 0.0.0.0 --pin 4821   # sur le réseau local : PIN obligatoire
```

Page unique (`ui/index.html`, sans dépendance ni police distante : le boîtier peut être hors ligne) : démarrer/arrêter le direct, état des connexions avec activation par lien, réglages (destination, résolution, débit, latence), journal. Tokens du site, thèmes Auto / Sombre / Clair. La clé de diffusion n'est jamais renvoyée à l'écran (masquée) et le fichier de réglages (`~/.syxtee-encoder/settings.json`) est en 0600. L'API (`/api/state`, `/api/start`, `/api/stop`, `/api/settings`, `/api/link`) est celle que le canal du Core réutilisera.

## Reste à faire

- Débit adaptatif appliqué en direct (`src/bitrate.ts` est prêt et testé ; il faut lire les stats SRT/SRTLA et changer le débit de l'encodeur sans couper le flux, ce que `gst-launch` ne permet pas : passer à une application GStreamer).
- Appairage au compte et canal de contrôle WebSocket avec le Core.
- Brancher `src/lib/encoder/supabaseProvider.ts` du site.
- UI locale : choix du réseau Wi-Fi au premier démarrage (NetworkManager), débit par lien sur Mac (le compteur vient de `/sys/class/net`, Linux seulement).
- Image système, mises à jour OTA.
- Valider le backend `rk3588` et la liste des caméras sur le vrai boîtier.

## Tester le bonding (Linux)

`scripts/bonding-test.sh` (en root, sur Linux : VM OrbStack, boîtier) crée deux espaces réseau, envoie la mire par l'agent en SRTLA sur deux liens (`wlan0`, `eth0`), applique perte et latence (`tc netem`), coupe un lien en plein direct puis le rétablit, et vérifie que le flux continue d'arriver. `srtla` (AGPL) est téléchargé et compilé par le script, pas ajouté au dépôt. Sur Mac : `orb create debian syxtee-enc`, puis `orb -m syxtee-enc sudo "$PWD/scripts/bonding-test.sh"` (paquets : `build-essential git iproute2 gstreamer1.0-plugins-{base,good,bad,ugly} gstreamer1.0-libav srt-tools`, et Node 24).
