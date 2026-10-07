-- Espaces partagés : une équipe (ex. « LAWCY TV ») avec ses propres flux, OBS et abonnement, où plusieurs comptes travaillent ensemble.
-- Un espace est porté par un compte technique (une ligne auth.users sans connexion possible) : tout ce qui appartient à un compte
-- (relais, postes OBS, sauvegardes…) appartient donc aussi à un espace, sans changer ces tables. Le compte technique n'a ni mot de passe ni email réel.
-- Les écritures viennent du serveur (clé de service) ; un membre ne peut que LIRE ses espaces et leurs membres (RLS).

create table public.workspaces (
  id uuid primary key references auth.users (id) on delete cascade, -- identifiant du compte technique
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '#3b5bdb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index workspaces_creator on public.workspaces (created_by);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user on public.workspace_members (user_id);

-- Invitations par email : le lien contient un secret (swi_…), seule son empreinte est en base.
create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  role text not null check (role in ('admin', 'member')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index workspace_invites_ws on public.workspace_invites (workspace_id) where accepted_at is null and revoked_at is null;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
revoke all on public.workspaces, public.workspace_members, public.workspace_invites from anon, authenticated;
grant select on public.workspaces, public.workspace_members to authenticated;

-- Un membre voit ses espaces et les membres de ces espaces. Les invitations ne se lisent que côté serveur.
-- (fonction security definer : une règle qui relit sa propre table bouclerait)
create function public.my_workspace_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select workspace_id from public.workspace_members where user_id = (select auth.uid())
$$;
revoke all on function public.my_workspace_ids() from public, anon;
grant execute on function public.my_workspace_ids() to authenticated;
create policy workspace_members_read on public.workspace_members for select to authenticated
  using (workspace_id in (select public.my_workspace_ids()));
create policy workspaces_read on public.workspaces for select to authenticated
  using (id in (select public.my_workspace_ids()));

-- La formule d'un espace est celle de son créateur : copiée sur le profil du compte technique à chaque changement.
create function public.sync_workspace_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles p
     set plan = new.plan, plan_until = new.plan_until, suspended_at = new.suspended_at
   where p.id in (select w.id from public.workspaces w where w.created_by = new.id);
  return new;
end $$;
create trigger profiles_sync_workspace_plan
  after update of plan, plan_until, suspended_at on public.profiles
  for each row when (old.plan is distinct from new.plan or old.plan_until is distinct from new.plan_until or old.suspended_at is distinct from new.suspended_at)
  execute function public.sync_workspace_plan();
