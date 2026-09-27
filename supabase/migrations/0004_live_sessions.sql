-- SYXTEE Core : historique des directs (une ligne par session de diffusion).
-- Écrit uniquement par le Core (clé secrète) : ouverture au début du flux, mise à jour toutes les 30 s, fermeture à la fin.
-- Une coupure de moins de 60 s ne ferme pas la session : elle compte comme une reconnexion.

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_name text,                              -- appareil déclaré par l'encodeur (null si inconnu)
  started_at timestamptz not null,
  ended_at timestamptz,                          -- null tant que le direct est en cours
  duration_s integer not null default 0 check (duration_s >= 0),
  avg_kbps integer not null default 0 check (avg_kbps >= 0),
  peak_kbps integer not null default 0 check (peak_kbps >= 0),
  reconnects integer not null default 0 check (reconnects >= 0),
  relay text not null,
  bitrate_series integer[] not null default '{}' -- débit moyen par tranche (60 points max), pour les mini-courbes
);

create index live_sessions_user_started on public.live_sessions (user_id, started_at desc);
-- Au plus une session ouverte par utilisateur.
create unique index live_sessions_one_open on public.live_sessions (user_id) where ended_at is null;

alter table public.live_sessions enable row level security;

create policy "Lire ses directs" on public.live_sessions
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.live_sessions from anon, authenticated;
grant select on public.live_sessions to authenticated;
