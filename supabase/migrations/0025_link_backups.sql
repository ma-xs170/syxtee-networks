-- SYXTEE Link : sauvegardes de scènes OBS (archive + médias), 5 Go par compte.
-- Les archives sont sur le disque du Core ; cette table ne garde que les métadonnées. Lue et écrite par le Core uniquement.
create table public.link_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  collection text not null default '' check (char_length(collection) <= 80),
  size bigint not null check (size > 0),
  media_count integer not null default 0 check (media_count >= 0),
  obs_version text not null default '' check (char_length(obs_version) <= 20),
  host text not null default '' check (char_length(host) <= 60),
  created_at timestamptz not null default now()
);

create index link_backups_user on public.link_backups (user_id, created_at desc);

alter table public.link_backups enable row level security;
-- Aucune politique : seul le Core (clé de service) y accède.
