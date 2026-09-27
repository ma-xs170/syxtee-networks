-- SYXTEE : mesures de couverture pour la carte communautaire.
-- Écrites uniquement par le Core (clé secrète), seulement si l'utilisateur a coché coverage_consent.
-- measurements : AUCUN user_id (device_hash anonyme, change chaque mois). Gardées 90 jours, puis seuls les agrégats restent.

-- ─────────────── Consentement (profil) ───────────────
alter table public.profiles
  add column coverage_consent boolean not null default false,
  add column coverage_consent_at timestamptz;

grant update (coverage_consent) on public.profiles to authenticated;

create function public.profiles_coverage_consent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.coverage_consent is distinct from old.coverage_consent then
    new.coverage_consent_at := case when new.coverage_consent then now() else null end;
  end if;
  return new;
end $$;

create trigger profiles_coverage_consent before update on public.profiles
  for each row execute function public.profiles_coverage_consent();

-- ─────────────── Zones privées (rien n'y est collecté) ───────────────
create table public.private_zones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Zone privée' check (char_length(label) between 1 and 40),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  radius_m integer not null default 300 check (radius_m between 100 and 2000),
  created_at timestamptz not null default now()
);
create index private_zones_user on public.private_zones (user_id);

-- 3 zones au plus par compte.
create function public.private_zones_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.private_zones where user_id = new.user_id) >= 3 then
    raise exception 'private_zones_limit' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger private_zones_limit before insert on public.private_zones
  for each row execute function public.private_zones_limit();

alter table public.private_zones enable row level security;
create policy "Lire ses zones" on public.private_zones for select to authenticated using ((select auth.uid()) = user_id);
create policy "Ajouter ses zones" on public.private_zones for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Supprimer ses zones" on public.private_zones for delete to authenticated using ((select auth.uid()) = user_id);
revoke update on public.private_zones from anon, authenticated;
grant select, insert, delete on public.private_zones to authenticated;

-- ─────────────── Mesures brutes (anonymes) ───────────────
create table public.measurements (
  id bigint generated always as identity primary key,
  ts timestamptz not null,
  lat double precision not null,
  lng double precision not null,
  accuracy_m real,
  h3_index text not null,                 -- H3 résolution 9 (~0,1 km²)
  operator text,                          -- marque (Digicel, Orange Caraïbe…) ; null = inconnu
  tech text not null default 'inconnu' check (tech in ('4g', '5g', 'inconnu')),
  link_type text not null default 'cell' check (link_type in ('cell', 'wifi', 'starlink')),
  up_kbps integer,
  rtt_ms integer,
  loss_pct real,
  source text not null check (source in ('live', 'scan', 'android')),
  device_hash text not null
);
create index measurements_ts on public.measurements (ts);
create index measurements_h3 on public.measurements (h3_index);

alter table public.measurements enable row level security;
revoke all on public.measurements from anon, authenticated;

-- ─────────────── Contributions (récompenses uniquement, 90 jours) ───────────────
create table public.contributions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  h3_index text not null,
  ts timestamptz not null
);
create index contributions_user_ts on public.contributions (user_id, ts desc);

alter table public.contributions enable row level security;
create policy "Lire ses contributions" on public.contributions for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.contributions from anon, authenticated;
grant select on public.contributions to authenticated;

-- ─────────────── Agrégats par hexagone (publics une fois assez de mesures) ───────────────
-- operator = '*' et tech = '*' : tous opérateurs / toutes technos confondus.
create table public.coverage_hex (
  h3_index text not null,
  operator text not null,
  tech text not null,
  median_kbps integer,
  p10_kbps integer,
  rtt_ms integer,
  loss_pct real,
  n integer not null,
  contributors integer not null,
  last_ts timestamptz not null,
  score text not null check (score in ('bonne', 'moyenne', 'mauvaise', 'inconnue')),
  freshness real not null,                -- 1 = récent ; décroît avec l'âge des mesures (≈ e^(−âge / 90 j))
  published boolean not null,             -- ≥ 3 contributeurs distincts OU ≥ 20 mesures
  updated_at timestamptz not null default now(),
  primary key (h3_index, operator, tech)
);

alter table public.coverage_hex enable row level security;
create policy "Hexagones publiés" on public.coverage_hex for select to anon, authenticated using (published);
revoke insert, update, delete on public.coverage_hex from anon, authenticated;
grant select on public.coverage_hex to anon, authenticated;

-- Agrégation (appelée par le Core toutes les 10 min) : purge à 90 jours puis recalcul des hexagones.
create function public.coverage_aggregate() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  delete from public.measurements where ts < now() - interval '90 days';
  delete from public.contributions where ts < now() - interval '90 days';

  with g as (
    select
      h3_index,
      case when grouping(operator) = 1 then '*' else coalesce(operator, 'inconnu') end as op,
      case when grouping(tech) = 1 then '*' else tech end as te,
      percentile_cont(0.5) within group (order by up_kbps) as med,
      percentile_cont(0.1) within group (order by up_kbps) as p10,
      percentile_cont(0.5) within group (order by rtt_ms) as rtt,
      avg(loss_pct) as loss,
      count(*) as cnt,
      count(distinct device_hash) as contrib,
      max(ts) as last_ts,
      avg(extract(epoch from now() - ts)) as age_s
    from public.measurements
    group by grouping sets ((h3_index, operator, tech), (h3_index))
  )
  insert into public.coverage_hex as c (h3_index, operator, tech, median_kbps, p10_kbps, rtt_ms, loss_pct, n, contributors, last_ts, score, freshness, published, updated_at)
  select
    h3_index, op, te, round(med)::int, round(p10)::int, round(rtt)::int, loss, cnt, contrib, last_ts,
    case
      when med is null then 'inconnue'
      when med < 2000 or coalesce(loss, 0) > 5 then 'mauvaise'
      when med >= 5000 and coalesce(loss, 0) < 2 then 'bonne'
      else 'moyenne'
    end,
    exp(-age_s / (90 * 86400.0)),
    contrib >= 3 or cnt >= 20,
    now()
  from g
  on conflict (h3_index, operator, tech) do update set
    median_kbps = excluded.median_kbps, p10_kbps = excluded.p10_kbps, rtt_ms = excluded.rtt_ms, loss_pct = excluded.loss_pct,
    n = excluded.n, contributors = excluded.contributors, last_ts = excluded.last_ts, score = excluded.score,
    freshness = excluded.freshness, published = excluded.published, updated_at = excluded.updated_at;
  get diagnostics n = row_count;

  -- Hexagones sans mesure récente : on garde le dernier agrégat, qui perd du poids avec le temps.
  update public.coverage_hex
    set freshness = exp(-extract(epoch from now() - last_ts) / (90 * 86400.0))
    where updated_at < now() - interval '15 minutes';

  return n;
end $$;

revoke execute on function public.coverage_aggregate() from public, anon, authenticated;
grant execute on function public.coverage_aggregate() to service_role;
