#!/usr/bin/env bash
# Déploiement sur le VPS : à lancer avec sudo depuis /opt/syxtee/repo (par GitHub Actions, ou à la main).
#   sudo /opt/syxtee/repo/scripts/deploy.sh
# Met le dépôt à jour (sans fusion), reconstruit web, caddy et core, attend que le site réponde, et revient au commit précédent si ça échoue.
set -euo pipefail

REPO="${REPO:-/opt/syxtee/repo}"
COMPOSE_DIR="${COMPOSE_DIR:-/opt/syxtee}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3100/api/health}"

cd "$REPO"
before="$(git rev-parse HEAD)"
git pull --ff-only
after="$(git rev-parse HEAD)"
echo "Déploiement ${before:0:7} -> ${after:0:7}"

build() {
  (cd "$COMPOSE_DIR" && docker compose up -d --build web caddy core)
}

wait_healthy() {
  for _ in $(seq 1 40); do
    if curl -fsS -m 5 "$HEALTH_URL" >/dev/null 2>&1; then return 0; fi
    sleep 3
  done
  return 1
}

build
if wait_healthy; then
  echo "OK : le site répond sur $HEALTH_URL"
  exit 0
fi

echo "ÉCHEC : le site ne répond pas, retour à ${before:0:7}" >&2
(cd "$COMPOSE_DIR" && docker compose logs --tail 40 web) >&2 || true
git checkout --quiet "$before"
build
wait_healthy && echo "Retour arrière réussi (HEAD détaché sur ${before:0:7} : relancer un git checkout main après correction)" >&2
exit 1
