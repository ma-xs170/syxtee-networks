-- Réglages audio du commutateur, mémorisés par compte : mode (BROADCAST ou PODCAST), mix-minus, réduction automatique.
create table if not exists public.mix_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  audio_mode text not null default 'broadcast' check (audio_mode in ('broadcast', 'podcast')),
  mix_minus boolean not null default false,
  auto_duck boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.mix_settings enable row level security;

create policy "Réglages MIX : lire les siens" on public.mix_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "Réglages MIX : créer les siens" on public.mix_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Réglages MIX : modifier les siens" on public.mix_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.mix_settings to authenticated;
