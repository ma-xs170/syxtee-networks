-- SYXTEE : espace admin (Prompt J). À exécuter sur le projet de production ET sur le projet de test.
--
-- Rôle en base, synchronisé depuis ADMIN_EMAILS (Vercel) à chaque connexion : l'email n'est jamais écrit ici.
-- Tout le reste est lu et écrit avec la clé secrète, côté serveur, derrière requireAdmin() + TOTP (aal2).

alter table public.profiles
  add column role text not null default 'user' check (role in ('user', 'admin'));

-- ─────────────── Notes internes (fiche compte) ───────────────
create table public.admin_notes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  author text not null,
  body text not null check (char_length(body) between 1 and 2000),
  at timestamptz not null default now()
);
create index admin_notes_user on public.admin_notes (user_id, at desc);
alter table public.admin_notes enable row level security;
revoke all on public.admin_notes from anon, authenticated;

-- ─────────────── Recherche des comptes (profil + email + dernière connexion) ───────────────
-- auth.users n'est pas lisible par l'API : fonction réservée à la clé secrète (service_role).
-- p_q : email, prénom, nom ou ID support (partiel). p_status : 'active' | 'suspended' | null.
-- p_ids : limite à ces comptes (filtre « en live », calculé à partir du Core). Tri : created | last_sign_in | name.
create function public.admin_accounts(
  p_q text default null,
  p_plan text default null,
  p_status text default null,
  p_ids uuid[] default null,
  p_sort text default 'created',
  p_limit int default 50,
  p_offset int default 0
) returns table (
  id uuid,
  support_id text,
  email text,
  first_name text,
  last_name text,
  plan text,
  plan_until timestamptz,
  suspended_at timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  total bigint
)
language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id, p.support_id, u.email::text as email, p.first_name, p.last_name, p.plan, p.plan_until, p.suspended_at,
      p.created_at, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where (p_q is null or p_q = ''
        or u.email ilike '%' || p_q || '%'
        or p.first_name ilike '%' || p_q || '%'
        or p.last_name ilike '%' || p_q || '%'
        or p.support_id ilike '%' || p_q || '%')
      and (p_plan is null or p_plan = '' or p.plan = p_plan)
      and (p_status is null or p_status = ''
        or (p_status = 'suspended' and p.suspended_at is not null)
        or (p_status = 'active' and p.suspended_at is null))
      and (p_ids is null or p.id = any (p_ids))
  )
  select b.*, count(*) over () as total
  from base b
  order by
    case when p_sort = 'last_sign_in' then b.last_sign_in_at end desc nulls last,
    case when p_sort = 'name' then lower(coalesce(b.last_name, '') || ' ' || coalesce(b.first_name, '')) end asc,
    b.created_at desc
  limit least(greatest(p_limit, 1), 5000) offset greatest(p_offset, 0);
$$;

revoke execute on function public.admin_accounts(text, text, text, uuid[], text, int, int) from public, anon, authenticated;
grant execute on function public.admin_accounts(text, text, text, uuid[], text, int, int) to service_role;

-- ─────────────── Carte communautaire : plus gros contributeurs (modération) ───────────────
create function public.admin_top_contributors(p_days int default 30, p_limit int default 50)
returns table (user_id uuid, support_id text, first_name text, last_name text, measures bigint, hexes bigint, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.user_id, p.support_id, p.first_name, p.last_name, count(*) as measures, count(distinct c.h3_index) as hexes, max(c.ts) as last_at
  from public.contributions c
  left join public.profiles p on p.id = c.user_id
  where c.ts > now() - make_interval(days => greatest(p_days, 1))
  group by c.user_id, p.support_id, p.first_name, p.last_name
  order by measures desc
  limit least(greatest(p_limit, 1), 500);
$$;

revoke execute on function public.admin_top_contributors(int, int) from public, anon, authenticated;
grant execute on function public.admin_top_contributors(int, int) to service_role;

-- ─────────────── Vue d'ensemble : heures de live sur N jours ───────────────
create function public.admin_live_hours(p_days int default 30) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(round(sum(duration_s) / 3600.0, 1), 0) from public.live_sessions
  where started_at > now() - make_interval(days => greatest(p_days, 1));
$$;

revoke execute on function public.admin_live_hours(int) from public, anon, authenticated;
grant execute on function public.admin_live_hours(int) to service_role;
