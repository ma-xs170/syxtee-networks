-- SYXTEE Link : appareils (agents installés sur le PC d'OBS) appairés à un compte.
-- Écrits et lus uniquement par le Core (clé secrète). Seule l'empreinte SHA-256 du jeton est stockée.
create table public.link_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'OBS' check (char_length(name) between 1 and 40),
  platform text not null default '' check (char_length(platform) <= 20),
  created_at timestamptz not null default now(),
  last_seen timestamptz
);

create index link_devices_user on public.link_devices (user_id);

alter table public.link_devices enable row level security;
-- Aucune politique : ni le navigateur ni la clé publique n'y accèdent, seul le Core (service) lit et écrit.
