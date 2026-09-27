#!/usr/bin/env bash
# Remplit /opt/syxtee/.env automatiquement, puis (re)démarre le Core et Caddy.
# Détecte : IP publique, domaine sslip.io, clé de l'API du relais (/root/.apikey ou logs du conteneur).
# Demande seulement ce qui manque : clé secrète Supabase et CORE_API_TOKEN (saisie masquée).
# Usage : bash /opt/syxtee/core/deploy/setup-env.sh
set -euo pipefail

DIR=/opt/syxtee
ENV="$DIR/.env"
SUPABASE_URL_DEFAULT="https://lhtxardbrdpbfojedpvc.supabase.co"

get() { [ -f "$ENV" ] && grep -E "^$1=" "$ENV" | tail -1 | cut -d= -f2- | tr -d '"' || true; }

IP=$(curl -s -4 -m 5 https://ifconfig.me || true)
[ -z "$IP" ] && IP=$(hostname -I | awk '{print $1}')
DOMAIN=$(get CORE_DOMAIN)
[ -z "$DOMAIN" ] && DOMAIN="${IP//./-}.sslip.io"
HOST=$(get RELAY_PUBLIC_HOST)
[ -z "$HOST" ] && HOST="$IP"

KEY=$(get SLS_API_KEY)
[ ${#KEY} -lt 8 ] && KEY=$(cat /root/.apikey 2>/dev/null || true)
[ ${#KEY} -lt 8 ] && KEY=$(docker logs srtla-receiver 2>&1 | grep -o 'Generated default admin API key: [A-Za-z0-9]*' | tail -1 | awk '{print $NF}' || true)
if [ ${#KEY} -lt 8 ]; then
  read -rsp "Clé de l'API du relais (introuvable automatiquement) : " KEY; echo
fi

SUPA_URL=$(get SUPABASE_URL)
[[ "$SUPA_URL" == https://* ]] || SUPA_URL="$SUPABASE_URL_DEFAULT"
SECRET=$(get SUPABASE_SECRET_KEY)
if [[ "$SECRET" != sb_secret_* ]]; then
  read -rsp "Clé secrète Supabase (sb_secret_…), puis Entrée : " SECRET; echo
fi
TOKEN=$(get CORE_API_TOKEN)
if [ ${#TOKEN} -ne 64 ]; then
  read -rsp "CORE_API_TOKEN (64 caractères, colle avec ⌘V), puis Entrée : " TOKEN; echo
fi

# Vérifications avant d'écrire quoi que ce soit.
fail() { echo "✖ $1"; exit 1; }
[[ "$SECRET" == sb_secret_* ]] || fail "La clé Supabase doit commencer par sb_secret_"
[ ${#TOKEN} -eq 64 ] || fail "CORE_API_TOKEN doit faire 64 caractères (reçu : ${#TOKEN})"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 -H "Authorization: Bearer $KEY" http://127.0.0.1:8080/api/stream-ids || true)
[ "$CODE" = "200" ] || fail "La clé de l'API du relais est refusée (HTTP $CODE)"

[ -f "$ENV" ] && cp "$ENV" "$ENV.bak.$(date +%s)"
umask 077
cat > "$ENV" <<EOF
CORE_DOMAIN=$DOMAIN
CORE_API_TOKEN=$TOKEN
SUPABASE_URL=$SUPA_URL
SUPABASE_SECRET_KEY=$SECRET
SLS_API_KEY=$KEY
RELAY_PUBLIC_HOST=$HOST
RELAY_NAME=$(get RELAY_NAME | grep . || echo nyc1)
CORS_ORIGINS=https://syxtee-networks.vercel.app,http://localhost:3000
TZ=America/Guadeloupe
REGIE_ENABLED=false
EOF
chmod 600 "$ENV"

# Dossier de données (historique santé, aperçus) : appartient à l'utilisateur « node » (uid 1000) du conteneur.
mkdir -p "$DIR/data" && chown -R 1000:1000 "$DIR/data"

echo "✔ .env écrit : domaine $DOMAIN · relais $HOST · clé relais ${#KEY} car. · jeton ${#TOKEN} car. · clé Supabase OK"
cd "$DIR"
docker compose up -d --force-recreate
echo "Démarrage (20 s)…"
sleep 20
docker compose ps
echo "--- Test :"
curl -s -m 10 "https://$DOMAIN/health" && echo || echo "Pas encore de réponse HTTPS : docker compose logs --tail 20 caddy"
