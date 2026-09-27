# SYXTEE Core

Service du VPS, à côté du `srtla-receiver` (OpenIRL). Il gère :

- **Clés de stream** par utilisateur : paires `live_…` / `play_…` déclarées dans le srt-live-server (SLS) et enregistrées dans Supabase (`stream_keys`).
- **Santé du flux** : relevé de `/stats/<play_id>` du SLS (débit, RTT, pertes, buffer, latence, liens SRTLA), 24 h d'historique (SQLite), temps réel en SSE.
- **Aperçu** : une vignette JPEG toutes les 3 s par flux live (ffmpeg, images-clés seules).
- **Régie** (désactivée par défaut) : sortie SRT toujours active, bascule automatique sur la mire SYXTEE si le téléphone coupe.

```
Moblin ──SRTLA :5000──► srtla-receiver (SLS) ──SRT :4000──► OBS
                           ▲ API + stats :8080 (localhost)
                     SYXTEE Core 127.0.0.1:8787 ◄── Caddy HTTPS (core.<domaine>) ◄── dashboard Vercel
```

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
