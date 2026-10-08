-- SYXTEE : comptes créés par l'équipe (identifiant + mot de passe donnés à la personne), durée indéfinie ou éphémère.
-- À exécuter sur le projet de production ET sur le projet de test.
--
-- À la première connexion, la personne doit choisir son mot de passe puis renseigner son adresse e-mail ; ensuite elle accède au site
-- selon la formule et les droits fixés par l'équipe. Un compte éphémère est supprimé tout seul à `expires_at` (tâche quotidienne),
-- et la personne est prévenue (bandeau dans le site, e-mail à J-3 quand l'adresse est connue).

create table if not exists public.managed_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Identifiant de connexion (sans « @ »). La connexion passe par l'adresse technique <identifiant>@comptes.syxtee-networks.fr.
  login text not null unique check (login ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Fin du compte ; null = durée indéfinie.
  expires_at timestamptz,
  must_change_password boolean not null default true,
  -- Tant que la personne n'a pas donné sa vraie adresse e-mail.
  email_required boolean not null default true,
  warned_at timestamptz,
  note text check (char_length(note) <= 200)
);
alter table public.managed_accounts enable row level security;
revoke all on public.managed_accounts from anon, authenticated;
create index if not exists managed_accounts_expires on public.managed_accounts (expires_at) where expires_at is not null;
