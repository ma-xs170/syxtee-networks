-- SYXTEE : carte de couverture v2.
-- Collecte mondiale, type de lien (cellular / wifi / starlink / fixed / unknown) avec confiance, grille H3 rés. 8/9/10,
-- publication dès 1 contributeur avec indice de fiabilité. Le calcul des hexagones passe dans le Core (src/aggregate.ts, testé),
-- qui réécrit coverage_hex ; cette migration ne garde en SQL que la purge, les compteurs et « Mes contributions ».

-- ─────────────── Mesures ───────────────
alter table public.measurements rename column h3_index to h3_9;
alter table public.measurements alter column h3_9 drop not null; -- null : point des 60 premières secondes (rés. 8 seulement)
alter table public.measurements
  add column h3_8 text,
  add column h3_10 text,
  add column coarse boolean not null default false,
  add column asn integer,
  add column link_conf real not null default 0.2,
  add column down_kbps integer,
  add column speed_kmh real,
  add column moving boolean not null default false;

alter table public.measurements drop constraint measurements_link_type_check;
-- 'cell' était une valeur par défaut, sans signal réel : reclassé par le backfill du Core.
update public.measurements set link_type = 'unknown' where link_type = 'cell';
alter table public.measurements alter column link_type set default 'unknown';
alter table public.measurements add constraint measurements_link_type_check
  check (link_type in ('cellular', 'wifi', 'starlink', 'fixed', 'unknown'));

drop index if exists public.measurements_h3;
create index measurements_h3_8 on public.measurements (h3_8);

-- ─────────────── Contributions : nombre de mesures par ligne ───────────────
alter table public.contributions add column n integer not null default 1 check (n >= 1);
create index contributions_h3 on public.contributions (h3_index, ts);

-- ─────────────── Préfixes IP appris (Android : connection.type) ───────────────
create table public.ip_prefix_class (
  prefix text primary key,                -- a.b.c.0/24 ou xxxx:xxxx:xxxx::/48
  cellular integer not null default 0,
  wifi integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.ip_prefix_class enable row level security;
revoke all on public.ip_prefix_class from anon, authenticated;

-- ─────────────── État interne (backfill…) ───────────────
create table public.coverage_meta (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.coverage_meta enable row level security;
revoke all on public.coverage_meta from anon, authenticated;

-- ─────────────── Agrégats (réécrits par le Core) ───────────────
drop function if exists public.coverage_aggregate();
drop table public.coverage_hex;

create table public.coverage_hex (
  res smallint not null check (res in (8, 9, 10)),
  h3_index text not null,
  parent8 text not null,
  layer text not null check (layer in ('cellular', 'starlink')),
  operator text not null,                 -- '*' = tous
  tech text not null,                     -- '*' = toutes
  mode text not null check (mode in ('all', 'foot', 'vehicle')),
  median_kbps integer,
  p10_kbps integer,
  down_kbps integer,
  rtt_ms integer,
  loss_pct real,
  n integer not null,
  contributors integer not null,
  days integer not null,
  hours integer[] not null,               -- mesures [matin, après-midi, soir, nuit] (heure solaire locale)
  reliability text not null check (reliability in ('estimation', 'fiable', 'tres_fiable')),
  score text not null check (score in ('bonne', 'moyenne', 'mauvaise', 'inconnue')),
  freshness real not null,
  last_ts timestamptz not null,           -- au jour près ; au mois près avec un seul contributeur
  first_month text not null,
  last_month text not null,
  published boolean not null,             -- ≥ 1 contributeur et ≥ 5 mesures valides
  updated_at timestamptz not null default now(),
  primary key (res, h3_index, layer, operator, tech, mode)
);
create index coverage_hex_parent8 on public.coverage_hex (parent8);

alter table public.coverage_hex enable row level security;
create policy "Hexagones publiés" on public.coverage_hex for select to anon, authenticated using (published);
revoke insert, update, delete on public.coverage_hex from anon, authenticated;
grant select on public.coverage_hex to anon, authenticated;

-- Purge à 90 jours (appelée chaque jour par le Core avant le recalcul complet).
create function public.coverage_purge() returns void
language sql security definer set search_path = '' as $$
  delete from public.measurements where ts < now() - interval '90 days';
  delete from public.contributions where ts < now() - interval '90 days';
$$;
revoke execute on function public.coverage_purge() from public, anon, authenticated;
grant execute on function public.coverage_purge() to service_role;

-- Backfill (Core) : hexagones et type de lien recalculés pour des mesures existantes.
create function public.coverage_backfill_rows(rows jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  update public.measurements m set
    h3_8 = x.h3_8, h3_9 = x.h3_9, h3_10 = x.h3_10, link_type = x.link_type, link_conf = x.link_conf
  from jsonb_to_recordset(rows) as x(id bigint, h3_8 text, h3_9 text, h3_10 text, link_type text, link_conf real)
  where m.id = x.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.coverage_backfill_rows(jsonb) from public, anon, authenticated;
grant execute on function public.coverage_backfill_rows(jsonb) to service_role;

-- ─────────────── Compteurs publics ───────────────
-- Surface : hexagones rés. 9 publiés de la couche 4G/5G (~0,105 km² chacun). Contributeurs : comptes distincts sur 90 jours.
create or replace function public.coverage_stats() returns json
language sql stable security definer set search_path = '' as $$
  with h as (
    select n from public.coverage_hex
    where published and res = 9 and layer = 'cellular' and operator = '*' and tech = '*' and mode = 'all'
  )
  select json_build_object(
    'hexes', (select count(*) from h),
    'km2', round((select count(*) from h) * 0.1053, 1),
    'measurements', (select coalesce(sum(n), 0) from h),
    'contributors', (select count(distinct user_id) from public.contributions)
  );
$$;
revoke execute on function public.coverage_stats() from public;
grant execute on function public.coverage_stats() to anon, authenticated, service_role;

-- ─────────────── Mes contributions (dashboard) ───────────────
-- discovered : hexagones où ma contribution est la toute première ; improved : hexagones publiés auxquels j'ai contribué.
create function public.my_coverage() returns json
language sql stable security definer set search_path = '' as $$
  with mine as (
    select h3_index, sum(n) as n, min(ts) as first_ts
    from public.contributions where user_id = (select auth.uid())
    group by h3_index
  ),
  firsts as (
    select c.h3_index, min(c.ts) as first_ts
    from public.contributions c join mine using (h3_index)
    group by c.h3_index
  ),
  pub as (
    select h.h3_index, h.score, h.reliability from public.coverage_hex h join mine using (h3_index)
    where h.published and h.res = 9 and h.layer = 'cellular' and h.operator = '*' and h.tech = '*' and h.mode = 'all'
  )
  select json_build_object(
    'measurements', coalesce((select sum(n) from mine), 0),
    'hexes', (select count(*) from mine),
    'discovered', (select count(*) from mine join firsts using (h3_index) where mine.first_ts <= firsts.first_ts),
    'improved', (select count(*) from pub),
    'cells', coalesce((
      select json_agg(json_build_object('h', mine.h3_index, 'n', mine.n, 'score', pub.score, 'reliability', pub.reliability))
      from mine left join pub using (h3_index)
    ), '[]'::json)
  );
$$;
revoke execute on function public.my_coverage() from public, anon;
grant execute on function public.my_coverage() to authenticated;
