-- Comptes Twitch, Kick et YouTube reliés pour écrire dans le chat (Multichat du dashboard).
-- Les jetons sont chiffrés par l'application (AES-256-GCM, clé CHAT_TOKEN_KEY) et ne sont lus que côté serveur
-- avec la clé secrète : aucune règle d'accès pour les clients, donc aucun accès depuis le navigateur.

create table if not exists public.chat_connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('twitch', 'kick', 'youtube')),
  account_id text not null,
  account_name text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, platform)
);

alter table public.chat_connections enable row level security;
revoke all on public.chat_connections from anon, authenticated;
