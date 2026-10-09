-- Notifications masquées par leur destinataire : « Supprimer » dans la cloche. La notification d'origine reste (une générale
-- sert à tout le monde) ; seule la ligne de masquage est propre au compte. Lues et écrites par le compte lui-même.
create table public.notification_dismissals (
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.notification_dismissals enable row level security;

create policy "masquées : les siennes" on public.notification_dismissals
  for select to authenticated using (user_id = (select auth.uid()));

create policy "masquées : masquer les siennes" on public.notification_dismissals
  for insert to authenticated with check (user_id = (select auth.uid()));
