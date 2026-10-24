-- Suppression de l'ID support (SYX-XXXX-XXXX) : les prises de contact passent par le chat du site, l'admin identifie les comptes par e-mail ou nom.

-- Les deux fonctions admin renvoyaient la colonne : on les recrée sans elle (le type de retour change, donc drop puis create).
drop function if exists public.admin_accounts(text, text, text, uuid[], text, int, int);
drop function if exists public.admin_top_contributors(int, int);

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
    select p.id, u.email::text as email, p.first_name, p.last_name, p.plan, p.plan_until, p.suspended_at,
      p.created_at, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where (p_q is null or p_q = ''
        or u.email ilike '%' || p_q || '%'
        or p.first_name ilike '%' || p_q || '%'
        or p.last_name ilike '%' || p_q || '%')
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

create function public.admin_top_contributors(p_days int default 30, p_limit int default 50)
returns table (user_id uuid, first_name text, last_name text, measures bigint, hexes bigint, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.user_id, p.first_name, p.last_name, count(*) as measures, count(distinct c.h3_index) as hexes, max(c.ts) as last_at
  from public.contributions c
  left join public.profiles p on p.id = c.user_id
  where c.ts > now() - make_interval(days => greatest(p_days, 1))
  group by c.user_id, p.first_name, p.last_name
  order by measures desc
  limit least(greatest(p_limit, 1), 500);
$$;

revoke execute on function public.admin_top_contributors(int, int) from public, anon, authenticated;
grant execute on function public.admin_top_contributors(int, int) to service_role;

-- La colonne (ses contraintes partent avec elle), puis le générateur.
alter table public.profiles drop column support_id;
drop function if exists public.new_support_id();
