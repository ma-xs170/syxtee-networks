-- Réseau de sponsors : candidatures des streamers, campagnes de marques, attribution aux streamers.
-- Tout passe par le serveur (clé secrète) : aucune politique, ni le navigateur ni la clé publique n'y accèdent.
create table public.sponsor_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null,
  categories text[] not null default '{}',
  message text not null default '' check (char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  handled_at timestamptz,
  handled_by text
);
create index sponsor_applications_status on public.sponsor_applications (status, created_at desc);

create table public.sponsor_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  brand text not null check (char_length(brand) between 1 and 80),
  category text not null default '' check (char_length(category) <= 40),
  pinned_message text not null default '' check (char_length(pinned_message) <= 300),
  link text not null default '' check (char_length(link) <= 300),
  code text not null default '' check (char_length(code) <= 40),
  active boolean not null default true
);

create table public.sponsor_assignments (
  campaign_id uuid not null references public.sponsor_campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);
create index sponsor_assignments_user on public.sponsor_assignments (user_id);

alter table public.sponsor_applications enable row level security;
alter table public.sponsor_campaigns enable row level security;
alter table public.sponsor_assignments enable row level security;
