# SYXTEE Core

Service du VPS, à côté du `srtla-receiver` (OpenIRL). Il gère :

- **Clés de stream** par utilisateur : paires `live_…` / `play_…` déclarées dans le srt-live-server (SLS) et enregistrées dans Supabase (`stream_keys`).
- **Santé du flux** : relevé de `/stats/<play_id>` du SLS (débit, RTT, pertes, buffer, latence, liens SRTLA), 24 h d'historique (SQLite), temps réel en SSE.
- **Historique des directs** : une ligne `live_sessions` (Supabase) par direct, ouverte au passage en ligne, fermée après 60 s hors ligne (coupure plus courte = reconnexion). Durée, débit moyen / crête, mini-courbe. Migration `supabase/migrations/0004_live_sessions.sql` à appliquer avant de déployer.
- **Statut en direct** : `/v1/me/status/stream` (SSE léger pour la barre du dashboard).
- **Aperçu** : une vignette JPEG toutes les 3 s par flux live (ffmpeg, images-clés seules).
- **Régie** (désactivée par défaut) : sortie SRT toujours active, bascule automatique sur la mire SYXTEE si le téléphone coupe.

```
Moblin ──SRTLA :5000──► srtla-receiver (SLS) ──SRT :4000──► OBS
                           ▲ API + stats :8080 (localhost)
                     SYXTEE Core 127.0.0.1:8787 ◄── Caddy HTTPS (core.<domaine>) ◄── dashboard Vercel
```

## Carte de couverture (mesures communautaires)

- **Consentement obligatoire**, vérifié par le Core : case `profiles.coverage_consent` relue (sans cache) juste avant chaque écriture. Décocher arrête la collecte en moins de 30 s.
- **Collecte mondiale** : aucun filtre de pays ni d'opérateur ; un opérateur inconnu garde son ASN et son nom brut.
- **Sources** : pendant un direct, débit / RTT / pertes du relais + dernière position envoyée par SYXTEE Cam (toutes les 2 s, avec `connection.type`) ; en **mode Scan** de SYXTEE Cam, un point = 3 micro-tests (5 pings, `POST /v1/cam/scan/up` pendant 2 s mesuré par le Core, `GET /v1/cam/scan/down` pendant 2 s mesuré par le téléphone) puis `POST /v1/cam/scan` (médianes).
- **Type de lien** (`src/link.ts`) : `cellular` / `wifi` / `starlink` / `fixed` / `unknown` + confiance. Signaux : `navigator.connection.type` (Android, 0,95), table `ASN_CLASSES` (Starlink AS14593, box, mobile, mixte), préfixes /24 et /48 appris depuis les Android (table `ip_prefix_class`), iPhone : IP changée après « Coupe le Wi-Fi ». Seul `cellular` ≥ 0,7 alimente la carte 4G/5G ; Starlink a sa couche ; le Wi-Fi n'est jamais publié ni compté en contribution.
- **Filtres** : précision GPS > 20 m, vitesse > 250 km/h, zones privées (table `private_zones`, 3 cercles max). La position exacte des 60 premières secondes de chaque session n'est jamais écrite (centre de l'hexagone rés. 8). Au-delà de 30 km/h : point « en mouvement ».
- **Tables** (migrations `0006`, `0009_coverage_v2.sql`) : `measurements` (sans user_id, `device_hash` HMAC qui change chaque mois, H3 rés. 8/9/10), `contributions` (récompenses, 90 j), `coverage_hex` (rés. 8/9/10 × couche × opérateur × techno × mode à pied / véhicule / tous), publiés dès 1 contributeur et 5 mesures.
- **Agrégation** (`src/aggregate.ts`, testée) : hexagones touchés toutes les 10 min, purge 90 j + recalcul complet chaque jour. Médiane ± 3 MAD par hexagone et opérateur, valeurs pondérées (fraîcheur, précision GPS, confiance du lien, poids 0,25 en mouvement sur la carte « à pied »), fiabilité Estimation / Fiable / Très fiable, tranches horaires, dates au mois près avec un seul contributeur.
- **Backfill v2** (`src/backfill.ts`) : lancé une fois au démarrage (clé `backfill_v2` de `coverage_meta`, qui garde aussi les chiffres).
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

### Commandes utiles

```bash
docker compose ps                 # état
docker compose logs --tail 100 core
docker compose restart core
du -sh /opt/syxtee/data           # historique santé (24 h) + aperçus
```

---

## Régie (mire automatique)

Réencode chaque flux en mode Régie (x264) : ~1,5–2 vCPU par flux 1080p, ~0,7 en 720p. **Pas sur le droplet 1 Go.**
Après passage à 4 Go / 2 vCPU minimum :

```bash
nano /opt/syxtee/.env      # REGIE_ENABLED=true et CORE_DOCKERFILE=Dockerfile.regie
docker compose up -d --build   # compile le plugin fallbackswitch (~10 min la première fois)
```

Réglages : `REGIE_WIDTH/HEIGHT/FPS/BITRATE_KBPS`, `REGIE_TIMEOUT_MS` (1500), `REGIE_BEEP` (bip 1 kHz discret), `TZ` (heure de la mire).
La bascule direct ↔ mire a été validée en local (GStreamer 1.28, gst-plugins-rs) ; l'image `Dockerfile.regie` est à valider au premier build.

## Limites connues

- Le SLS limite `/stats` à 300 requêtes/min par IP : le Core relève chaque flux live toutes les secondes jusqu'à ~4 flux,
  puis espace les relevés. Pour plus de flux : `rate_limit_stats` dans `sls.conf` du relais.
- « Paquets récupérés » n'est pas exposé par le SLS : le dashboard affiche les paquets **perdus** (définitivement).
