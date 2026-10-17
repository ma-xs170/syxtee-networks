-- Développeurs : clés d'API (lecture seule) et webhooks (live.started / live.ended).
-- Tout passe par le serveur (clé secrète) : aucune politique, ni le navigateur ni la clé publique n'y accèdent.
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index api_keys_user on public.api_keys (user_id, created_at desc);

create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null check (char_length(url) <= 300),
  events text[] not null default '{live.started,live.ended}',
  secret text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_at timestamptz,
  last_status int
);
create index webhooks_user on public.webhooks (user_id);

alter table public.api_keys enable row level security;
alter table public.webhooks enable row level security;
