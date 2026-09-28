-- SYXTEE : relais multiples (SRTLA ou RTMP), créés par chaque compte. Remplace stream_keys (une paire par compte).
-- Écrits uniquement par le Core (clé secrète). Chacun peut lire ses propres relais.
-- À appliquer AVANT de déployer le Core qui lit `relays`.

create table public.relays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),     -- appareil qui utilise ce relais
  protocol text not null check (protocol in ('srtla', 'rtmp')),
  server text not null default 'nyc1' check (server ~ '^[a-z0-9]{2,12}$'),
  publish_id text not null unique,      -- clé de diffusion (secret) : Moblin / DJI / OBS publient avec
  play_id text not null unique,         -- OBS lit avec, en mode Direct (secret)
  out_publish_id text not null unique,  -- la régie republie avec (interne au Core)
  out_play_id text not null unique,     -- OBS lit avec, en mode Régie (secret)
  cam_key text unique,                  -- SYXTEE Cam publie vers ce relais
  mode text not null default 'direct' check (mode in ('direct', 'regie')),
  status text not null default 'offline' check (status in ('live', 'offline')),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  last_live_at timestamptz
);

create index relays_user on public.relays (user_id, created_at);

alter table public.relays enable row level security;

create policy "Lire ses relais" on public.relays
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.relays from anon, authenticated;
grant select on public.relays to authenticated;

-- ─────────────── Historique des directs rattaché au relais ───────────────
alter table public.live_sessions add column relay_id uuid references public.relays (id) on delete set null;
drop index if exists public.live_sessions_one_open;
create unique index live_sessions_one_open on public.live_sessions (relay_id) where ended_at is null and relay_id is not null;
create index live_sessions_relay_started on public.live_sessions (relay_id, started_at desc);

-- ─────────────── Reprise des clés existantes : mêmes identifiants, les URLs continuent de marcher ───────────────
-- Nom = appareil du dernier direct s'il est connu, sinon « Relais 1 ».
insert into public.relays (user_id, name, protocol, server, publish_id, play_id, out_publish_id, out_play_id, cam_key, mode, created_at, rotated_at, last_live_at)
select
  k.user_id,
  coalesce(
    left(nullif(trim((select s.device_name from public.live_sessions s
      where s.user_id = k.user_id and s.device_name is not null order by s.started_at desc limit 1)), ''), 40),
    'Relais 1'
  ),
  'srtla',
  'nyc1',
  k.publish_id, k.play_id, k.out_publish_id, k.out_play_id, k.cam_key, k.mode, k.created_at, k.rotated_at,
  (select max(s.started_at) from public.live_sessions s where s.user_id = k.user_id)
from public.stream_keys k;

update public.live_sessions s set relay_id = r.id
from public.relays r
where r.user_id = s.user_id and s.relay_id is null;

-- stream_keys n'est plus lue ni écrite. Elle est gardée une version par sécurité, puis supprimée dans une migration suivante.
comment on table public.stream_keys is 'Obsolète depuis 0008_relays : remplacée par relays.';
