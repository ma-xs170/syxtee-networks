# SYXTEE Core

Service du VPS, à côté du `srtla-receiver` (OpenIRL). Il gère :

- **Relais** : chaque compte crée ses relais (SRTLA ou RTMP, dans la limite de sa formule). Chaque relais a sa paire `live_…` / `play_…` déclarée dans le srt-live-server (SLS) et enregistrée dans Supabase (`relays`, migration `0008_relays.sql`). Un relais archivé est retiré du SLS.
- **Entrée RTMP** (DJI, GoPro, Insta360, OBS) : MediaMTX reçoit `rtmp://<hôte>:1935/live/<clé>`, le Core vérifie la clé puis republie le flux en SRT dans le SLS (vidéo copiée, son AAC). OBS lit ensuite en SRT comme pour SRTLA.
- **Latence** : `GET /ping` (204, CORS ouvert) pour choisir le serveur le plus proche depuis le navigateur.
- **Santé du flux** (par relais) : relevé de `/stats/<play_id>` du SLS (débit, RTT, pertes, buffer, latence, liens SRTLA), 24 h d'historique (SQLite), temps réel en SSE.
- **Historique des directs** : une ligne `live_sessions` (Supabase) par direct, ouverte au passage en ligne, fermée après 60 s hors ligne (coupure plus courte = reconnexion). Durée, débit moyen / crête, mini-courbe. Migration `supabase/migrations/0004_live_sessions.sql` à appliquer avant de déployer.
- **Statut en direct** : `/v1/me/status/stream` (SSE léger pour la barre du dashboard).
- **Aperçu** : une vignette JPEG toutes les 3 s par flux live (ffmpeg, images-clés seules).
- **Régie** (désactivée par défaut) : sortie SRT toujours active, bascule automatique sur la mire SYXTEE si le téléphone coupe.

```
Moblin ──SRTLA :5000──► srtla-receiver (SLS) ──SRT :4000──► OBS
DJI ──RTMP :1935──► MediaMTX ──► Core (ffmpeg, copie) ──SRT :4001──┘
                           ▲ API + stats :8080 (localhost)
                     SYXTEE Core 127.0.0.1:8787 ◄── Caddy HTTPS (core.<domaine>) ◄── dashboard Vercel
```

## Sécurité des clés (relais SRTLA, SRT, RTMP, Cam)

- **Deux clés par relais**, 128 bits aléatoires chacune (`crypto.randomBytes`) : `live_…` (publication : Moblin, DJI, encodeur) et `play_…` (lecture : OBS). Aucune ne se déduit de l'autre, de l'ID ou de l'email.
- **En base, jamais en clair** (migrations `0010_relay_security.sql` puis `0011_drop_plain_keys.sql`) : empreintes SHA-256 en colonnes `UNIQUE` (tous comptes confondus, nouvelle génération en cas de collision) + clés chiffrées en AES-256-GCM (`keys_enc`, secret `RELAY_KEYS_SECRET` du `.env` du VPS, **à sauvegarder**). Le navigateur ne lit plus ces colonnes ; seul le Core déchiffre, pour le propriétaire.
- **Vérification serveur** : le SLS vérifie chaque streamid dans sa base, et le Core n'y déclare QUE les relais autorisés (compte non suspendu, formule avec relais, non archivé, dans le quota), réalignés toutes les 30 s. À chaque publieur accepté, le Core revérifie en base (formule, suspension, quota, flux simultanés) et coupe sinon. RTMP et Cam : `authHTTPAddress` de MediaMTX vers le Core (même règles).
- **Un seul éditeur par clé** : le SLS refuse le 2e (testé), MediaMTX aussi (`overridePublisher: false`). Le propriétaire voit « Tentative de connexion sur ton relais depuis <IP / pays> » dans Sécurité & clés (via SRTLA, l'IP du téléphone n'est pas visible : alerte si les tentatives insistent).
- **Régénérer / archiver / supprimer** : paire retirée du SLS, sessions en cours coupées (Guard) ; RTMP et Cam coupés via l'API MediaMTX dans la seconde.
- **SYXTEE Guard** (`src/guard.ts`, service `guard`, root) : suit le journal du SLS (API Docker) et applique les ordres du Core avec iptables dans le réseau du conteneur `srtla-receiver` (coupure d'une IP:port, bannissement).
- **Force brute** : 10 refus en 1 min pour une IP → bannie 15 min (SRT/SRTLA par le Guard, RTMP/Cam par le Core). Journal `security_events` (90 j), table `ip_bans`, page admin `/admin/securite` (emails `ADMIN_EMAILS` sur Vercel). Les IP internes (srtla_rec, Docker) et `SECURITY_ALLOW_IPS` ne sont jamais bannies.
- **Limite** : via SRTLA, le SLS voit toutes les connexions depuis `127.0.0.1` (srtla_rec) ; le bannissement par IP ne s'applique donc qu'au SRT direct, au RTMP et à la Cam. La clé (128 bits) reste la protection principale.

Audit réel sur le VPS (compte temporaire, vraies connexions ffmpeg, tout est effacé à la fin) :

```bash
cd /opt/syxtee && docker compose exec -T core node --input-type=module - < core/test/security-audit.mjs
```

## Carte de couverture (mesures communautaires)

- **Consentement obligatoire**, vérifié par le Core : case `profiles.coverage_consent` relue (sans cache) juste avant chaque écriture. Décocher arrête la collecte en moins de 30 s.
- **Collecte mondiale** : aucun filtre de pays ni d'opérateur ; un opérateur inconnu garde son ASN et son nom brut.
- **Sources** : pendant un direct, débit / RTT / pertes du relais + dernière position envoyée par SYXTEE Cam (toutes les 2 s, avec `connection.type`) ; avec le **Scanner réseau** (`/dashboard/scanner`, aussi l'Analyseur), un point = 3 micro-tests (5 pings, `POST /v1/cam/scan/up` pendant 2 s mesuré par le Core, `GET /v1/cam/scan/down` pendant 2 s mesuré par le téléphone) puis `POST /v1/cam/scan` (médianes).
- **Type de lien** (`src/link.ts`) : `cellular` / `wifi` / `starlink` / `fixed` / `unknown` + confiance. Signaux : `navigator.connection.type` (Android, 0,95), table `ASN_CLASSES` (Starlink AS14593, box, mobile, mixte), préfixes /24 et /48 appris depuis les Android (table `ip_prefix_class`), iPhone : IP changée après « Coupe le Wi-Fi », et **opérateur déclaré** (`profiles.mobile_operator`) : cohérent avec l'ASN → 0,9 ; ASN inconnu ou masqué → 0,75 (étiquette `declared`) ; autre marque sur un ASN mixte, ou ASN fixe → box (Wi-Fi). ASN des Antilles-Guyane vérifiés (RIPE / ARIN) : Orange Caraïbe 16028 (mobile), Digicel AFG 48252, Outremer / SFR Caraïbe 20776, Free Caraïbe 210595, Dauphin 33392 / 36511, UTS 11081 (mixtes), Canal+ Telecom 21351 (box) ; la marque se déduit aussi du nom (`brandKey`). Seul `cellular` ≥ 0,7 alimente la carte 4G/5G ; Starlink a sa couche ; le Wi-Fi n'est jamais publié ni compté en contribution.
- **Filtres** : précision GPS > 20 m, vitesse > 250 km/h, zones privées (table `private_zones`, 3 cercles max). La position exacte des 60 premières secondes de chaque session n'est jamais écrite (centre de l'hexagone rés. 8). Au-delà de 30 km/h : point « en mouvement ».
- **Tables** (migrations `0006`, `0009_coverage_v2.sql`) : `measurements` (sans user_id, `device_hash` HMAC qui change chaque mois, H3 rés. 8/9/10), `contributions` (récompenses, 90 j), `coverage_hex` (rés. 8/9/10 × couche × opérateur × techno × mode à pied / véhicule / tous), publiés dès 1 contributeur et 5 mesures.
- **Agrégation** (`src/aggregate.ts`, testée) : hexagones touchés toutes les 10 min, purge 90 j + recalcul complet chaque jour. Médiane ± 3 MAD par hexagone et opérateur, valeurs pondérées (fraîcheur, précision GPS, confiance du lien, poids 0,25 en mouvement sur la carte « à pied »), fiabilité Estimation / Fiable / Très fiable, tranches horaires, dates au mois près avec un seul contributeur.
- **Relais privé iCloud** (`src/privaterelay.ts`) : liste officielle des IP de sortie d'Apple (`mask-api.icloud.com/egress-ip-ranges.csv`), téléchargée chaque jour dans `data/icloud_egress.csv`, ~7 000 plages fusionnées en mémoire. IP dans la liste ou ASN Apple / Cloudflare / Akamai / Fastly → étiquette `private_relay`, comptée seulement avec un opérateur déclaré ; le Scanner affiche le bandeau « Le Relais privé iCloud masque ton opérateur ».
- **File d'attente** (`src/pending.ts`, table `measurement_pending`, migration `0014_scanner.sql`) : base IPinfo absente (jeton, téléchargement) → mesure `pending`, IP gardée à part et reclassée toutes les 10 min dès que la base est là ; au bout de 14 jours, tranchée sans ASN et IP effacée.
- **Backfill v3** (`src/backfill.ts`) : lancé une fois au démarrage (clé `backfill_v3` de `coverage_meta`, qui garde aussi les chiffres, dont `unknown_to_cellular` et `unknown_why`). ASN manquant déduit des autres mesures du même appareil et du même opérateur. `POST /v1/users/:id/coverage/reclassify` reclasse les mesures d'un compte après sa déclaration d'opérateur.
- **Effacement** : `DELETE /v1/users/:id/coverage` (bouton dans Paramètres et suppression du compte).
- **Opérateur** : base IPinfo Lite (`IPINFO_TOKEN`, CC BY-SA 4.0), téléchargée dans `data/ipinfo_lite.mmdb` et rafraîchie chaque semaine. Sans jeton : opérateur inconnu.

### TODO : opérateur de chaque lien SRTLA pendant un direct

Testé le 27/09/2026 sur le VPS, sans toucher au relais : `conntrack` n'est pas installé, `nf_conntrack_acct` vaut 0, et surtout
tous les liens SRTLA arrivent sur le même port UDP 5000. Rien ne permet de rattacher une IP source à un streamer sans les données
internes de srtla-receiver (groupes SRTLA). Pistes : exposer l'IP de chaque peer dans `/stats` du SLS (patch OpenIRL), ou lire
les groupes dans srtla-receiver. En attendant, les mesures d'un direct n'ont pas d'opérateur ; le mode Scan, si.
Si on reprend la piste conntrack : `apt-get install conntrack`, puis `echo net.netfilter.nf_conntrack_acct=1 > /etc/sysctl.d/90-conntrack-acct.conf && sysctl --system` (sans redémarrer Docker).

## Développement

```
npm install
npm test                                   # tests unitaires
node test/integration.mjs ../.env.local    # Core + faux SLS + vrai Supabase (utilisateur temporaire)
```

---

## Déploiement sur le VPS (pas à pas, via Termius)

Toutes les commandes se lancent en SSH sur le VPS. Remplace `<IP>` par l'IP publique du droplet.

### 1. Inventaire (à faire une fois, colle-moi la sortie)

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'
find / -maxdepth 4 -name receiver.sh 2>/dev/null
sudo ufw status verbose
nproc; free -h; df -h /
```

### 2. Mémoire d'échange (swap) : indispensable sur 1 Go pour construire l'image

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Fermer l'interface et l'API du relais au public

Docker **contourne ufw** : un port publié par Docker reste ouvert même si ufw le bloque. Dans le dossier du
srtla-receiver (trouvé à l'étape 1), ouvrir le fichier compose utilisé (`docker-compose.prod.yml` ou `docker-compose.yml`) :

```bash
cd <dossier-du-srtla-receiver>
nano docker-compose.prod.yml
```

Remplacer les lignes des ports `3000` et `8080` pour les lier à la machine seulement :

```yaml
      - "127.0.0.1:3000:3000"
      - "127.0.0.1:8080:8080"
```

(les ports `5000/udp`, `4000/udp`, `4001/udp` ne changent pas), puis :

```bash
docker compose -f docker-compose.prod.yml up -d
cat .apikey        # clé de l'API SLS : à mettre dans SLS_API_KEY (étape 5)
```

L'interface web du relais reste accessible via un tunnel SSH : Termius → Port Forwarding → Local `3000` → `127.0.0.1:3000`.

### 4. Pare-feu

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp          # SSH
sudo ufw allow 80/tcp          # Caddy (certificat HTTPS)
sudo ufw allow 443/tcp         # API du Core en HTTPS
sudo ufw allow 5000/udp        # SRTLA (Moblin)
sudo ufw allow 4000/udp        # SRT lecture (OBS)
sudo ufw allow 4001/udp        # SRT publication (IRL Pro, encodeurs)
sudo ufw allow 1935/tcp        # RTMP (caméras DJI, GoPro, OBS)
sudo ufw enable
sudo apt-get install -y fail2ban && sudo systemctl enable --now fail2ban
```

### 5. Installer le Core

```bash
sudo mkdir -p /opt/syxtee && sudo chown $USER /opt/syxtee && cd /opt/syxtee
git clone --depth 1 --filter=blob:none --sparse https://github.com/ma-xs170/syxtee-networks.git repo
cd repo && git sparse-checkout set core && cd ..
ln -s repo/core core
cp core/deploy/docker-compose.yml core/deploy/Caddyfile .
bash core/deploy/setup-env.sh   # remplit .env (demande la clé Supabase et CORE_API_TOKEN), démarre et teste
```

Dans `.env` :

| Variable | Valeur |
|---|---|
| `CORE_DOMAIN` | ton domaine (`core.<domaine>`, enregistrement DNS A vers `<IP>`) ou, sans domaine, `<IP avec des tirets>.sslip.io` (ex. `203-0-113-7.sslip.io`) |
| `CORE_API_TOKEN` | la valeur générée par `openssl rand -hex 32` |
| `SUPABASE_URL` | `https://lhtxardbrdpbfojedpvc.supabase.co` |
| `SUPABASE_SECRET_KEY` | clé `sb_secret_…` (Supabase → Project Settings → API Keys) |
| `SLS_API_KEY` | contenu de `.apikey` (étape 3) |
| `RELAY_PUBLIC_HOST` | `<IP>` ou un domaine du relais (ce que les streamers collent dans Moblin/OBS) |

```bash
mkdir -p data && chown -R 1000:1000 data   # le Core tourne en utilisateur « node » (uid 1000)
docker compose up -d --build
docker compose logs -f core     # attendre « prêt sur :8787 », puis Ctrl+C
curl https://<CORE_DOMAIN>/health
```

Réponse attendue : `{"ok":true,"sls":true,"streams_live":0}`.

### 6. Brancher le dashboard (Vercel)

Sur Vercel (Production + Preview), ajouter `CORE_URL=https://<CORE_DOMAIN>` et `CORE_API_TOKEN=<même valeur>`, puis redéployer.

### Mettre à jour

```bash
cd /opt/syxtee/repo && git pull && cd .. && docker compose up -d --build
```

### Passage aux relais multiples (une fois, dans cet ordre)

1. Supabase → SQL Editor : exécuter `supabase/migrations/0008_relays.sql` (les clés existantes deviennent « Relais 1 », mêmes URLs).
2. Vérifier que le port RTMP est libre : `sudo ss -ltnp | grep 1935` (rien ne doit s'afficher), puis `sudo ufw allow 1935/tcp`.
3. Mettre à jour le Core (commande ci-dessus) : il lit désormais `relays`, et MediaMTX écoute en RTMP.
4. Pousser le dashboard sur Vercel.

### Passage aux clés chiffrées (une fois, dans cet ordre)

1. Supabase : appliquer `0010_relay_security.sql`.
2. `.env` : `RELAY_KEYS_SECRET=$(openssl rand -hex 32)` (à sauvegarder hors du VPS) et `SECURITY_ALLOW_IPS=<IP du VPS>`.
3. Arrêter tout autre service sur le port 1935 (`sudo ss -ltnp | grep 1935`), puis mettre à jour le Core : il chiffre les clés existantes au démarrage (« N relais : clés chiffrées »), le Guard démarre.
4. Supabase : appliquer `0011_drop_plain_keys.sql` (supprime les colonnes en clair et `stream_keys`).
5. Lancer l'audit ci-dessus : tout doit être ✅.

### Commandes utiles

```bash
docker compose ps                 # état
docker compose logs --tail 100 core
docker compose restart core
du -sh /opt/syxtee/data           # historique santé (24 h) + aperçus
```

---

## Régie (mire automatique)

**La mire est native** : dès que `REGIE_ENABLED=true`, **tous** les relais autorisés passent par la régie (plus de choix Direct / Régie). Le Core ignore la colonne `mode` (migration `0022_regie_native.sql` pour l'aligner). L'URL OBS d'un relais est toujours celle de sortie de la régie (`out_play_id`) ; l'ancienne URL de lecture directe continue de marcher, mais sans mire. Une régie tourne en permanence par relais autorisé, même hors direct (mire statique : peu de CPU) ; compte ~0,7 vCPU de plus pendant un direct en 720p.

Réencode chaque flux en mode Régie (x264) : ~1,5–2 vCPU par flux 1080p, ~0,7 en 720p. **Pas sur le droplet 1 Go.**
Après passage à 4 Go / 2 vCPU minimum :

```bash
bash core/deploy/enable-regie.sh   # après git pull : vérifie 4 Go / 2 vCPU, écrit .env, construit et relance le Core
# (à la main : nano /opt/syxtee/.env avec REGIE_ENABLED=true et CORE_DOCKERFILE=Dockerfile.regie)
docker compose up -d --build   # compile le plugin fallbackswitch (~10 min la première fois)
```

Sortie fixe **1920 x 1080, 30 images/s, 6 Mb/s** par défaut : l'entrée (quel que soit son format) et la mire sont mises à cette taille, donc OBS lit toujours le même format. Compte ~1,5 à 2 vCPU par relais en direct en 1080p (mire statique : très peu). Pour alléger : `REGIE_WIDTH=1280 REGIE_HEIGHT=720 REGIE_BITRATE_KBPS=4000`.

Réglages : `REGIE_WIDTH/HEIGHT/FPS/BITRATE_KBPS`, `REGIE_TIMEOUT_MS` (1500), `REGIE_BEEP` (bip 1 kHz discret), `REGIE_TZ` (fuseau de l’heure de la mire, `Europe/Paris` par défaut).
La bascule direct ↔ mire a été validée en local (GStreamer 1.28, gst-plugins-rs) ; l'image `Dockerfile.regie` est à valider au premier build.

## SYXTEE STUDIO : diffusion vers les plateformes

Le studio (page `/studio` du site) compose le programme dans le navigateur. Le bouton **Diffuser** l'envoie au Core, qui le retransmet en RTMP :

```
navigateur ──WebRTC (WHIP)──► Caddy ► MediaMTX ──RTSP local──► ffmpeg (1 encodage) ──RTMP(S) tee──► Twitch / Kick / YouTube…
              cam.<domaine>/stu_<hex>/whip        (média sur 8189 UDP + TCP)
```

- `POST /v1/me/studio/session` (jeton de session Supabase) : ouvre une session avec 1 à 5 destinations `{ name, url }` et un débit (1 000 à 8 000 kb/s). Renvoie `whip_url`. Réservé aux comptes qui ont au moins un relais autorisé (formule payante, non suspendu). Une session par compte : une nouvelle remplace l'ancienne.
- `GET /v1/me/studio/status` : `idle`, `waiting` (en attente du navigateur) ou `live`. `DELETE /v1/me/studio/session` : arrête.
- **Les adresses RTMP avec clés de stream ne sont jamais enregistrées** : elles restent en mémoire du Core le temps de la session et sont retirées des logs (`rtmp://***`).
- **Protection SSRF** : seules des adresses `rtmp://` ou `rtmps://` vers des IP publiques sont acceptées (IP privées, locales, `localhost`, identifiants dans l'URL refusés ; le nom est résolu et toutes ses adresses doivent être publiques).
- Un seul `ffmpeg` par session (H.264 `veryfast`, images clés toutes les 2 s, AAC 160 kb/s) en sortie `tee` avec `onfail=ignore` : une plateforme en panne n'arrête pas les autres. Compte environ 0,5 à 1 vCPU par direct 720p30.
- Le chemin MediaMTX `stu_<32 hex>` est secret. MediaMTX n'accepte la publication que sur un chemin de session ouvert (`/internal/mediamtx/auth`), en WebRTC. Une session sans publication expire après 10 minutes ; si le navigateur se déconnecte, la session se ferme.
- **Pare-feu : le média WebRTC passe par le port `8189` en UDP et en TCP** (déjà nécessaire à SYXTEE Cam) : `ufw allow 8189/udp && ufw allow 8189/tcp`, et le même dans le pare-feu réseau de l'hébergeur.
- Désactiver : `STUDIO_ENABLED=false` dans `.env`. Variables communes avec la Cam : `CAM_ENABLED`, `CAM_WHIP_BASE`, `MEDIAMTX_*`.

## Limites connues

- Le SLS limite `/stats` à 300 requêtes/min par IP : le Core relève chaque flux live toutes les secondes jusqu'à ~4 flux,
  puis espace les relevés. Pour plus de flux : `rate_limit_stats` dans `sls.conf` du relais.
- « Paquets récupérés » n'est pas exposé par le SLS : le dashboard affiche les paquets **perdus** (définitivement).
