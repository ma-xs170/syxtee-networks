-- Vidéastes : type de compte et fiche de l'annuaire public.
-- La photo de la fiche est l'avatar du profil (profiles.avatar_url). Tout passe par le serveur (clé secrète) : aucune politique, ni le navigateur ni la clé publique n'y accèdent.

alter table public.profiles
  add column account_type text not null default 'streamer' check (account_type in ('streamer', 'videaste'));

create table public.videographer_cards (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  region text not null check (char_length(btrim(region)) between 2 and 80),
  country text not null default 'FR' check (country ~ '^[A-Z]{2}$'),
  price_from integer check (price_from between 0 and 100000),
  price_to integer check (price_to between 0 and 100000),
  price_unit text not null default 'journee' check (price_unit in ('heure', 'demi-journee', 'journee', 'projet')),
  bio text not null default '' check (char_length(bio) <= 500),
  specialties text[] not null default '{}' check (cardinality(specialties) <= 6),
  -- draft : jamais envoyée · pending : à relire par l'équipe · published : visible · rejected : refusée (motif dans review_note).
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'rejected')),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_to is null or price_from is null or price_to >= price_from)
);

create index videographer_cards_public on public.videographer_cards (status, country, region);

alter table public.videographer_cards enable row level security;
