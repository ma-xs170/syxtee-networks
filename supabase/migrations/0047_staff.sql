-- Équipe SYXTEE : membres du personnel (rôles, permissions modifiables), invitations par e-mail, prise en charge des tickets de support.
-- Le propriétaire (OWNER_EMAIL, sinon la 1re adresse de ADMIN_EMAILS) et les adresses de ADMIN_EMAILS restent gérés par l'environnement ;
-- les autres membres vivent ici. Tout passe par la clé secrète du serveur : RLS activée, aucune règle publique.

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'developer', 'debugger', 'security', 'support')),
  -- Permissions accordées (clés de src/lib/staff.ts). Écrites à la création d'après le préréglage du rôle, puis modifiables une par une.
  permissions text[] not null default '{}',
  active boolean not null default true,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 5 and 254),
  role text not null check (role in ('admin', 'developer', 'debugger', 'security', 'support')),
  permissions text[] not null default '{}',
  -- SHA-256 du jeton envoyé par e-mail : le jeton lui-même n'est jamais stocké.
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz
);
alter table public.staff_invites enable row level security;
create index if not exists staff_invites_email on public.staff_invites (lower(email));

-- Support : ticket pris en charge par un membre de l'équipe, messages système et signature de l'agent.
alter table public.support_tickets
  add column if not exists assigned_to uuid references auth.users (id) on delete set null,
  add column if not exists assigned_at timestamptz;
create index if not exists support_tickets_assigned on public.support_tickets (assigned_to, status);

alter table public.support_messages
  add column if not exists kind text not null default 'message' check (kind in ('message', 'system')),
  add column if not exists signature text;
