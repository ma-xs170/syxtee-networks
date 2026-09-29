-- SYXTEE : Scanner réseau + correctif « réseau inconnu ».
-- 1. Opérateur mobile déclaré par le compte (iPhone : pas de navigator.connection.type).
-- 2. Étiquettes des mesures : 'private_relay' (Relais privé iCloud), 'declared' (opérateur déclaré utilisé),
--    'declared_mismatch' (le réseau contredit la déclaration : box d'un autre opérateur), 'pending' (en attente
--    de reclassement), 'asn_inferred' (ASN déduit des autres mesures du même appareil, backfill).
-- 3. File d'attente des mesures à reclasser quand la base IPinfo manque : l'IP n'est gardée que le temps du
--    reclassement (14 jours au plus), jamais lisible depuis le navigateur.
-- 4. Backfill : l'ASN et les étiquettes font partie des lignes réécrites.

-- ─────────────── Opérateur déclaré ───────────────
alter table public.profiles
  add column mobile_operator text check (mobile_operator in ('orange', 'sfr', 'digicel', 'free', 'other'));
grant update (mobile_operator) on public.profiles to authenticated;

-- ─────────────── Étiquettes ───────────────
alter table public.measurements add column tags text[] not null default '{}';

-- ─────────────── File de reclassement ───────────────
create table public.measurement_pending (
  measurement_id bigint primary key references public.measurements (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade, -- pour la contribution, si la mesure finit comptée
  ip text not null,
  ctx jsonb not null default '{}',    -- { declared, ct, switched, caribbean }
  created_at timestamptz not null default now()
);
create index measurement_pending_created on public.measurement_pending (created_at);
alter table public.measurement_pending enable row level security;
revoke all on public.measurement_pending from anon, authenticated;

-- ─────────────── Backfill : ASN et étiquettes ───────────────
create or replace function public.coverage_backfill_rows(rows jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  update public.measurements m set
    h3_8 = x.h3_8, h3_9 = x.h3_9, h3_10 = x.h3_10, link_type = x.link_type, link_conf = x.link_conf,
    operator = coalesce(x.operator, m.operator), asn = coalesce(x.asn, m.asn), tags = coalesce(x.tags, m.tags)
  from jsonb_to_recordset(rows) as x(id bigint, h3_8 text, h3_9 text, h3_10 text, link_type text, link_conf real, operator text, asn integer, tags text[])
  where m.id = x.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.coverage_backfill_rows(jsonb) from public, anon, authenticated;
grant execute on function public.coverage_backfill_rows(jsonb) to service_role;
