-- E-mails « mise à jour du plugin disponible » : un seul par compte et par version publiée.
create table if not exists public.plugin_update_notices (
  user_id uuid not null references auth.users (id) on delete cascade,
  version text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.plugin_update_notices enable row level security;
revoke all on public.plugin_update_notices from anon, authenticated;
