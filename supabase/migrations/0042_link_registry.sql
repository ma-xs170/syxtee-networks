-- SYXTEE Link, lot 1 : registre des postes OBS, jetons à durée courte, journal d'audit, historique des diffusions, versions de sauvegardes.
-- Les écritures viennent du Core (clé de service). Le navigateur ne peut que LIRE ses propres lignes (RLS), jamais les empreintes de jetons.

-- 1. Appareils = instances OBS
alter table public.link_devices
  add column org_id uuid, -- réservé : rattachement futur à une organisation (aucun modèle pour l'instant)
  add column os text not null default '' check (char_length(os) <= 40),
  add column host text not null default '' check (char_length(host) <= 60),
  add column plugin_version text not null default '' check (char_length(plugin_version) <= 20),
  add column online_since timestamptz, -- non nul tant que l'agent est connecté au Core
  add column token_expires_at timestamptz, -- jeton d'accès (slk_) ; null = ancien jeton long, encore accepté
  add column refresh_hash text unique, -- empreinte SHA-256 du jeton de renouvellement (slr_), tourné à chaque usage
  add column refresh_expires_at timestamptz,
  add column revoked_at timestamptz,
  add column scopes text[] not null default '{profile,email,offline,obs.control,backups}';

create index link_devices_active on public.link_devices (user_id) where revoked_at is null;

-- Lecture par le propriétaire, colonnes sûres seulement (pas de token_hash ni refresh_hash).
revoke all on public.link_devices from anon, authenticated;
grant select (id, user_id, name, platform, os, host, plugin_version, online_since, last_seen, created_at, revoked_at, scopes, org_id) on public.link_devices to authenticated;
create policy link_devices_own_read on public.link_devices for select to authenticated using (user_id = (select auth.uid()));

-- 2. Journal d'audit : qui a fait quoi, quand (actions d'OBS et refus ; pas les lectures)
create table public.link_audit (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid references public.link_devices (id) on delete set null,
  method text not null check (char_length(method) <= 60),
  ok boolean not null,
  error text check (char_length(error) <= 40),
  detail text check (char_length(detail) <= 120),
  created_at timestamptz not null default now()
);
create index link_audit_user on public.link_audit (user_id, created_at desc);
alter table public.link_audit enable row level security;
revoke all on public.link_audit from anon, authenticated;
grant select on public.link_audit to authenticated;
create policy link_audit_own_read on public.link_audit for select to authenticated using (user_id = (select auth.uid()));

-- 3. Historique des diffusions (alimenté par l'agent au lot 5)
create table public.broadcasts_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid references public.link_devices (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  avg_kbps integer check (avg_kbps >= 0),
  peak_kbps integer check (peak_kbps >= 0),
  lost_pct numeric(5, 2) check (lost_pct between 0 and 100),
  incidents integer not null default 0 check (incidents >= 0)
);
create index broadcasts_history_user on public.broadcasts_history (user_id, started_at desc);
alter table public.broadcasts_history enable row level security;
revoke all on public.broadcasts_history from anon, authenticated;
grant select on public.broadcasts_history to authenticated;
create policy broadcasts_history_own_read on public.broadcasts_history for select to authenticated using (user_id = (select auth.uid()));

-- 4. Sauvegardes : versions par collection (les 4 dernières sont gardées)
alter table public.link_backups add column version integer not null default 1 check (version >= 1);
revoke all on public.link_backups from anon, authenticated;
grant select on public.link_backups to authenticated;
create policy link_backups_own_read on public.link_backups for select to authenticated using (user_id = (select auth.uid()));
