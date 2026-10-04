-- Notes de version publiées depuis /admin/versions. Le numéro (majeur.mineur.correctif) est calculé par le serveur
-- à partir de la dernière version : correctif, mineure ou majeure. Écrites et lues uniquement par le serveur (clé secrète).
create table public.releases (
  id uuid primary key default gen_random_uuid(),
  major int not null check (major >= 0),
  minor int not null check (minor >= 0),
  patch int not null check (patch >= 0),
  title text not null check (char_length(title) between 1 and 120),
  notes text not null check (char_length(notes) between 1 and 3500),
  created_by text not null,
  discord_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (major, minor, patch)
);

create index releases_version on public.releases (major desc, minor desc, patch desc);

alter table public.releases enable row level security;
-- Aucune policy : ni lecture ni écriture depuis le navigateur.
