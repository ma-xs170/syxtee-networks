#!/usr/bin/env bash
# Active la régie (mire de coupure) sur le VPS. À lancer en root, dans /opt/syxtee, APRÈS avoir redimensionné le droplet.
#   cd /opt/syxtee && git -C core pull 2>/dev/null; bash core/deploy/enable-regie.sh
# Refuse de continuer sous 3,5 Go de RAM ou 2 vCPU : le ré-encodage x264 ne tient pas sur le droplet 1 Go.
set -euo pipefail

DIR="${DIR:-/opt/syxtee}"
ENV="$DIR/.env"
[ -f "$ENV" ] || { echo "✖ $ENV introuvable (lance d'abord setup-env.sh)."; exit 1; }

MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
CPUS=$(nproc)
if [ "$MEM_MB" -lt 3500 ] || [ "$CPUS" -lt 2 ]; then
  echo "✖ ${MEM_MB} Mo de RAM, ${CPUS} vCPU : il faut au moins 4 Go et 2 vCPU. Redimensionne le droplet, puis relance."
  exit 1
fi

set_var() { # clé valeur : remplace ou ajoute la ligne dans .env
  if grep -q "^$1=" "$ENV"; then sed -i "s|^$1=.*|$1=$2|" "$ENV"; else echo "$1=$2" >> "$ENV"; fi
}
cp "$ENV" "$ENV.bak.$(date +%s)"
set_var REGIE_ENABLED true
set_var CORE_DOCKERFILE Dockerfile.regie
set_var REGIE_TZ America/Guadeloupe

cd "$DIR"
cp "$DIR/core/deploy/docker-compose.yml" "$DIR/core/deploy/Caddyfile" "$DIR/"
# Premier build de Dockerfile.regie : GStreamer et gst-plugins-rs, plusieurs minutes.
docker compose build core
docker compose up -d --force-recreate core
sleep 5
docker compose logs --tail 40 core | grep -i "regie\|régie\|error" || true
echo "✔ Régie activée. Dans le dashboard, ouvre un relais : le mode « Régie » (mire de coupure) est proposé."
echo "  Retour arrière : remets REGIE_ENABLED=false et CORE_DOCKERFILE vide dans $ENV (sauvegarde : $ENV.bak.*), puis docker compose up -d --build core."
