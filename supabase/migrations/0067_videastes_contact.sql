-- Annuaire des vidéastes : identifiant public des fiches et messages de contact.
-- Le visiteur écrit via SYXTEE (jamais d'e-mail affiché) ; le vidéaste reçoit le message dans son espace et par notification.

-- Identifiant public : l'adresse d'une fiche n'expose jamais l'identifiant du compte.
alter table public.videographer_cards add column public_id uuid not null default gen_random_uuid();
create unique index videographer_cards_public_id on public.videographer_cards (public_id);

create table public.videographer_messages (
  id uuid primary key default gen_random_uuid(),
  card_user_id uuid not null references auth.users (id) on delete cascade,
  from_name text not null check (char_length(btrim(from_name)) between 2 and 80),
  from_email text not null check (char_length(from_email) between 5 and 160),
  body text not null check (char_length(btrim(body)) between 20 and 1500),
  created_at timestamptz not null default now()
);

create index videographer_messages_card on public.videographer_messages (card_user_id, created_at desc);

-- Tout passe par le serveur (clé secrète) : aucune politique.
alter table public.videographer_messages enable row level security;
