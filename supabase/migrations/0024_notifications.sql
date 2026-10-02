-- Notifications envoyées par un admin : à tous les comptes (user_id null) ou à un seul.
-- Écrites uniquement par le serveur (clé secrète). Lues par leur destinataire, marquées lues par lui.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

create index notifications_user on public.notifications (user_id, created_at desc);

create table public.notification_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

create policy "notifications : lecture des siennes et des générales" on public.notifications
  for select to authenticated using (user_id is null or user_id = (select auth.uid()));

create policy "lectures : les siennes" on public.notification_reads
  for select to authenticated using (user_id = (select auth.uid()));

create policy "lectures : marquer les siennes" on public.notification_reads
  for insert to authenticated with check (user_id = (select auth.uid()));
