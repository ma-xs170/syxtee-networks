-- Formules Production (équipes) : trois paliers (prod_s, prod_m, prod_l), types de membres et responsable d'un direct planifié.
-- Ordre de mise en ligne : Core redéployé d'abord (il connaît les trois formules), puis cette migration, puis le site.

alter table public.profiles drop constraint profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'basic', 'beta', 'paid', 'extra', 'prod_s', 'prod_m', 'prod_l', 'partner', 'admin'));

-- Un membre d'espace est un streamer (un relais chacun), un vidéaste ou de l'équipe d'encadrement (jamais compté dans les limites).
alter table public.workspace_members add column kind text not null default 'streamer' check (kind in ('streamer', 'videaste', 'staff'));
alter table public.workspace_invites add column kind text not null default 'streamer' check (kind in ('streamer', 'videaste', 'staff'));

-- Propriétaires et admins existants : encadrement, jamais comptés dans les limites d'une Production.
update public.workspace_members set kind = 'staff' where role in ('owner', 'admin');

-- Planning de production : le membre responsable d'un direct planifié (null : non attribué).
alter table public.scheduled_lives add column assignee_id uuid references auth.users (id) on delete set null;
create index scheduled_lives_assignee on public.scheduled_lives (assignee_id, starts_at) where assignee_id is not null;
