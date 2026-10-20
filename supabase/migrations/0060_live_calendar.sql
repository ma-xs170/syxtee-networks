-- Calendrier des prochains directs : lives planifiés d'un compte (ou d'un espace partagé) et lien de partage en lecture seule.
-- Tout passe par le serveur (clé secrète) : aucune politique, ni le navigateur ni la clé publique n'y accèdent.
create table public.scheduled_lives (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  location text not null default '' check (char_length(location) <= 120),
  description text not null default '' check (char_length(description) <= 2000),
  platforms text[] not null default '{}' check (cardinality(platforms) <= 10),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at and ends_at - starts_at <= interval '7 days')
);
create index scheduled_lives_owner_start on public.scheduled_lives (owner_id, starts_at);

-- Un lien par calendrier ; le jeton est le secret (le retirer ou le renouveler coupe l'accès de tous ceux qui l'ont).
create table public.calendar_shares (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  token text not null unique check (token ~ '^[0-9a-f]{32}$'),
  created_at timestamptz not null default now()
);

alter table public.scheduled_lives enable row level security;
alter table public.calendar_shares enable row level security;
