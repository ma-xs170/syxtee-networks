-- Invitations au contrôle à distance : une personne SANS compte pilote ton OBS avec un lien secret.
-- Le lien contient un secret (sli_…), seule son empreinte SHA-256 est en base. Droits choisis à chaque invitation :
--   view    : voir seulement (aperçu, scènes, sources, niveaux)
--   scenes  : view + changer de scène, afficher/masquer une source, régler le son
--   full    : scenes + démarrer/arrêter le direct et l'enregistrement, changer de profil ou de collection
-- Les écritures viennent du Core (clé de service). Le propriétaire ne peut que LIRE ses invitations (jamais l'empreinte).
create table public.link_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid references public.link_devices (id) on delete cascade, -- null : tous les postes du compte
  label text not null check (char_length(label) between 1 and 40),
  email text check (email is null or char_length(email) <= 254),
  level text not null check (level in ('view', 'scenes', 'full')),
  token_hash text not null unique,
  expires_at timestamptz, -- null : valable jusqu'à révocation
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index link_invites_owner on public.link_invites (owner_id) where revoked_at is null;

alter table public.link_invites enable row level security;
revoke all on public.link_invites from anon, authenticated;
grant select (id, owner_id, device_id, label, email, level, expires_at, revoked_at, last_used_at, created_at) on public.link_invites to authenticated;
create policy link_invites_own_read on public.link_invites for select to authenticated using (owner_id = (select auth.uid()));
