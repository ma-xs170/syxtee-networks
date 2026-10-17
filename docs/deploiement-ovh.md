# Déploiement sur un VPS OVH (Node + Nginx)

Le site est une application Next.js en mode `standalone` : un seul processus Node derrière Nginx. Aucun service propriétaire.

## 1. Build

```bash
# Sur le VPS (Node 24) ou en CI
npm ci
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... npm run build
```

Ou avec Docker (image prête, voir `Dockerfile`) :

```bash
docker build -t syxtee-web \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... .
docker run -d --name syxtee-web --restart unless-stopped -p 127.0.0.1:3000:3000 --env-file .env.production syxtee-web
```

## 2. Copie des fichiers (sans Docker)

```bash
mkdir -p /srv/syxtee && rsync -a .next/standalone/ /srv/syxtee/
rsync -a .next/static/ /srv/syxtee/.next/static/
rsync -a public/ /srv/syxtee/public/
cd /srv/syxtee && PORT=3000 HOSTNAME=127.0.0.1 node server.js   # à mettre dans un service systemd
```

## 3. Nginx (HTTP/2, brotli/gzip, cache long)

```nginx
# /etc/nginx/conf.d/syxtee.conf
gzip on;
gzip_comp_level 6;
gzip_min_length 512;
gzip_vary on;
gzip_types text/css application/javascript application/json image/svg+xml text/plain;
# brotli (paquet libnginx-mod-http-brotli-filter) : décommenter si installé
# brotli on; brotli_comp_level 5; brotli_types text/css application/javascript application/json image/svg+xml;

upstream syxtee_web { server 127.0.0.1:3000; keepalive 16; }

server {
  listen 443 ssl http2;
  server_name syxtee-networks.fr www.syxtee-networks.fr;
  ssl_certificate     /etc/letsencrypt/live/syxtee-networks.fr/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/syxtee-networks.fr/privkey.pem;

  # Fichiers au nom haché : cache d'un an, jamais revalidés.
  location /_next/static/ {
    proxy_pass http://syxtee_web;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
  # Images et polices du dossier public : 1 jour + relecture en douceur.
  location ~* ^/(images|visuals|devices|icons|videos|glass-icons)/ {
    proxy_pass http://syxtee_web;
    add_header Cache-Control "public, max-age=86400, stale-while-revalidate=604800";
  }
  location / {
    proxy_pass http://syxtee_web;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
server { listen 80; server_name syxtee-networks.fr www.syxtee-networks.fr; return 301 https://$host$request_uri; }
```

`sudo nginx -t && sudo systemctl reload nginx`

## 4. Vérifier

```bash
curl -sI -H 'Accept-Encoding: br,gzip' https://syxtee-networks.fr/ | grep -iE 'content-encoding|cache-control|HTTP/2'
npx lighthouse https://syxtee-networks.fr/connexion --only-categories=performance --view
```

## Règles de perf tenues par le code

- Dashboard et admin (`.dash-surface`) : aucune animation, aucun flou ; transition de 120 ms sur boutons, liens et toggles seulement.
- Effets décoratifs du site public isolés dans `src/styles/fx.css` (chargé par `(site)` et `(auth)`, jamais par le dashboard).
- Polices en local (`src/app/fonts`, Geist via le paquet `geist`) ; logos de plateformes dans `src/lib/brand-icons.ts`.
- `supabase-js` chargé à la demande (`src/lib/supabase/lazy.ts`).
