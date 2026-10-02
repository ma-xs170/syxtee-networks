-- Support : tickets et messages (chat intégré). Écrits par le serveur (clé secrète) après vérification du propriétaire ;
-- lus par le propriétaire du ticket. Le personnel (admins) passe par le serveur.
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 120),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_reply_at timestamptz,
  resolved_at timestamptz,
  last_from text not null default 'user' check (last_from in ('user', 'staff'))
);

create index support_tickets_user on public.support_tickets (user_id, updated_at desc);
create index support_tickets_status on public.support_tickets (status, updated_at desc);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  from_staff boolean not null default false,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index support_messages_ticket on public.support_messages (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

create policy "tickets : les siens" on public.support_tickets
  for select to authenticated using (user_id = (select auth.uid()));

create policy "messages : ceux de ses tickets" on public.support_messages
  for select to authenticated using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = (select auth.uid()))
  );
