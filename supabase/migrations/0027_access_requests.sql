-- Demandes d'accès (formulaire public « Demander l'accès »). Écrites et lues uniquement par le serveur (clé secrète) :
-- le formulaire est public, l'admin les traite. À l'approbation, le compte qui se crée avec la même adresse (vérifiée)
-- reçoit automatiquement la formule Partenaire.
create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null check (char_length(last_name) between 1 and 60),
  email text not null check (char_length(email) between 5 and 160),
  channel_url text not null check (char_length(channel_url) between 3 and 200),
  platform text not null check (platform in ('twitch', 'kick', 'youtube', 'tiktok', 'autre')),
  audience text not null default '' check (char_length(audience) <= 40),
  devices text not null default '' check (char_length(devices) <= 200),
  message text not null default '' check (char_length(message) <= 1500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'refused')),
  decided_at timestamptz,
  decided_by text,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users (id) on delete set null
);

create index access_requests_status on public.access_requests (status, created_at desc);
create index access_requests_email on public.access_requests (lower(email));

alter table public.access_requests enable row level security;
-- Aucune politique : ni le navigateur ni la clé publique n'y accèdent, seul le serveur lit et écrit.
