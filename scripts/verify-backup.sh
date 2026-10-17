#!/usr/bin/env bash
# Vérifie qu'une sauvegarde de la base SE RESTAURE vraiment : copie le schéma public de production dans une base
# jetable (Docker, ou un Postgres déjà lancé via SCRATCH_URL), puis compare le nombre de lignes de chaque table.
#
#   SOURCE_URL="postgresql://postgres:…@db.<ref>.supabase.co:5432/postgres" scripts/verify-backup.sh
#
# SOURCE_URL : chaîne de connexion à la base à tester (Supabase → Project Settings → Database → Connection string, « Session pooler »).
#              Pour tester un fichier de sauvegarde déjà téléchargé : BACKUP_FILE=sauvegarde.sql (au lieu de SOURCE_URL).
# Rien n'est écrit dans la base source (lecture seule). Code de sortie 1 : une table manque ou est vide alors qu'elle ne l'est pas en source.
set -euo pipefail

work="$(mktemp -d)"
trap 'rm -rf "$work"; [ -n "${container:-}" ] && docker rm -f "$container" >/dev/null 2>&1 || true' EXIT

if [ -n "${BACKUP_FILE:-}" ]; then
  cp "$BACKUP_FILE" "$work/dump.sql"
  src_counts=""
else
  : "${SOURCE_URL:?SOURCE_URL (ou BACKUP_FILE) est obligatoire}"
  echo "1/4 Sauvegarde du schéma public…"
  pg_dump "$SOURCE_URL" --schema=public --no-owner --no-privileges --file="$work/dump.sql"
  count_sql="select string_agg(format('select %L as t, count(*) as n from public.%I', tablename, tablename), ' union all ' order by tablename) from pg_tables where schemaname='public'"
  src_counts="$(psql "$SOURCE_URL" -Atc "$(psql "$SOURCE_URL" -Atc "$count_sql") order by 1" -F ' ')"
fi

if [ -z "${SCRATCH_URL:-}" ]; then
  echo "2/4 Démarrage d'un Postgres jetable (Docker)…"
  container="verify-backup-$$"
  docker run -d --name "$container" -e POSTGRES_PASSWORD=scratch -p 54329:5432 postgres:17 >/dev/null
  SCRATCH_URL="postgresql://postgres:scratch@localhost:54329/postgres"
  for _ in $(seq 1 40); do pg_isready -d "$SCRATCH_URL" >/dev/null 2>&1 && break; sleep 1; done
fi

echo "3/4 Restauration dans la base jetable…"
# Les tables publiques pointent vers auth.users (gérée par Supabase) : on la remplace par une coquille vide, clés étrangères suspendues.
psql "$SCRATCH_URL" -q -v ON_ERROR_STOP=0 <<'SQL' >/dev/null 2>"$work/prep.log"
create schema if not exists auth; create schema if not exists extensions; create schema if not exists private;
create table if not exists auth.users (id uuid primary key, email text, created_at timestamptz, last_sign_in_at timestamptz, email_confirmed_at timestamptz, raw_user_meta_data jsonb, raw_app_meta_data jsonb);
create or replace function auth.uid() returns uuid language sql as 'select null::uuid';
create or replace function auth.role() returns text language sql as 'select null::text';
do $$ begin
  create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin; exception when duplicate_object then null; end $$;
SQL
PGOPTIONS="-c session_replication_role=replica -c check_function_bodies=off" psql "$SCRATCH_URL" -q -v ON_ERROR_STOP=0 -f "$work/dump.sql" >/dev/null 2>"$work/restore.log" || true
echo "   Messages d'erreur à la restauration : $(grep -c '^psql:.*ERROR' "$work/restore.log" || true) (vues et règles liées à Supabase : normal ; voir $work/restore.log si besoin)"

echo "4/4 Comparaison des tables…"
dst_sql="select string_agg(format('select %L as t, count(*) as n from public.%I', tablename, tablename), ' union all ' order by tablename) from pg_tables where schemaname='public'"
dst_counts="$(psql "$SCRATCH_URL" -Atc "$(psql "$SCRATCH_URL" -Atc "$dst_sql") order by 1" -F ' ')"
tables="$(printf '%s\n' "$dst_counts" | wc -l | tr -d ' ')"
echo "   Tables restaurées : $tables"

status=0
if [ -n "$src_counts" ]; then
  while IFS=' ' read -r t n; do
    [ -z "$t" ] && continue
    restored="$(printf '%s\n' "$dst_counts" | awk -v t="$t" '$1==t{print $2}')"
    if [ -z "$restored" ]; then echo "   ✗ $t : table absente après restauration"; status=1
    elif [ "$restored" = "0" ] && [ "$n" != "0" ]; then echo "   ✗ $t : vide après restauration ($n lignes en source)"; status=1
    elif [ "$restored" != "$n" ]; then echo "   ~ $t : $restored restaurées / $n en source (écart normal si la table bouge pendant le test)"
    fi
  done <<< "$src_counts"
else
  printf '%s\n' "$dst_counts" | sed 's/^/   /'
fi
[ "$status" = "0" ] && echo "RÉSULTAT : la sauvegarde se restaure (${tables} tables)." || echo "RÉSULTAT : ÉCHEC, voir ✗ ci-dessus."
exit "$status"
