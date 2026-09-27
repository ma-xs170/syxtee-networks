-- SYXTEE Core : clés de stream par utilisateur.
-- Écrites uniquement par le Core (clé secrète). Chacun peut lire sa propre ligne.

create table public.stream_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  publish_id text not null unique,      -- Moblin publie avec (secret)
  play_id text not null unique,         -- OBS lit avec, en mode Direct (secret)
  out_publish_id text not null unique,  -- la régie republie avec (interne au Core)
  out_play_id text not null unique,     -- OBS lit avec, en mode Régie (secret)
  mode text not null default 'direct' check (mode in ('direct', 'regie')),
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

alter table public.stream_keys enable row level security;

create policy "Lire ses clés" on public.stream_keys
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.stream_keys from anon, authenticated;
grant select on public.stream_keys to authenticated;
