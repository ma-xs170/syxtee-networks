-- Demandes de devis (formulaire public « Contacter » : live IRL en mobilité). Écrites et lues uniquement par le serveur (clé secrète) :
-- le formulaire est public, l'équipe les traite. L'équipe est aussi prévenue par e-mail.
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 5 and 160),
  phone text not null default '' check (char_length(phone) <= 30),
  channel text not null default '' check (char_length(channel) <= 200),
  event_type text not null check (char_length(event_type) between 1 and 60),
  location text not null check (char_length(location) between 1 and 120),
  event_date text not null default '' check (char_length(event_date) <= 60),
  duration text not null default '' check (char_length(duration) <= 40),
  audience text not null default '' check (char_length(audience) <= 60),
  needs text[] not null default '{}',
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'answered', 'closed')),
  handled_at timestamptz,
  handled_by text
);

create index quote_requests_status on public.quote_requests (status, created_at desc);
create index quote_requests_email on public.quote_requests (lower(email));

alter table public.quote_requests enable row level security;
-- Aucune politique : ni le navigateur ni la clé publique n'y accèdent, seul le serveur lit et écrit.
