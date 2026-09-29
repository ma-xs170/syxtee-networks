-- SYXTEE : sécurité des clés de relais.
-- 1. Les clés ne sont plus stockées en clair : empreintes SHA-256 (UNIQUE, tous comptes confondus) + clés chiffrées
--    en AES-256-GCM par le Core (keys_enc, secret RELAY_KEYS_SECRET du VPS). Au démarrage, le Core chiffre les
--    lignes existantes et vide les colonnes en clair ; la migration 0011 les supprime ensuite.
-- 2. Formule et suspension du compte, vérifiées par le Core à chaque connexion au relais.
-- 3. Journal de sécurité (refus, 2e appareil, coupures) et IP bannies.
-- À appliquer AVANT de déployer le Core qui lit keys_enc.

-- ─────────────── 1. Clés des relais ───────────────
alter table public.relays
  add column publish_hash text,
  add column play_hash text,
  add column out_publish_hash text,
  add column out_play_hash text,
  add column cam_hash text,
  add column keys_enc text;

alter table public.relays
  alter column publish_id drop not null,
  alter column play_id drop not null,
  alter column out_publish_id drop not null,
  alter column out_play_id drop not null;

alter table public.relays
  add constraint relays_publish_hash_key unique (publish_hash),
  add constraint relays_play_hash_key unique (play_hash),
  add constraint relays_out_publish_hash_key unique (out_publish_hash),
  add constraint relays_out_play_hash_key unique (out_play_hash),
  add constraint relays_cam_hash_key unique (cam_hash),
  add constraint relays_hash_format check (
    (publish_hash is null or publish_hash ~ '^[0-9a-f]{64}$') and (play_hash is null or play_hash ~ '^[0-9a-f]{64}$')
  ),
  -- Une ligne a soit ses clés chiffrées (avec empreintes), soit (avant migration par le Core) ses clés en clair.
  add constraint relays_keys_present check (
    (keys_enc is not null and publish_hash is not null and play_hash is not null and out_publish_hash is not null and out_play_hash is not null)
    or publish_id is not null
  );

-- Le propriétaire lit ses relais (nom, statut…) sans jamais recevoir les clés, même chiffrées : le dashboard les
-- obtient du Core, qui vérifie la propriété.
revoke select on public.relays from authenticated;
grant select (id, user_id, name, protocol, server, mode, status, archived, created_at, rotated_at, last_live_at) on public.relays to authenticated;

-- ─────────────── 2. Formule et suspension ───────────────
-- Tous les comptes restent en bêta tant que les formules (Gratuit / Payant / Partenaire) ne sont pas en place.
-- Colonnes non modifiables par l'utilisateur (droits de mise à jour de 0001 inchangés).
alter table public.profiles
  add column plan text not null default 'beta' check (plan in ('free', 'beta', 'paid', 'partner', 'admin')),
  add column suspended_at timestamptz;

-- ─────────────── 3. Journal de sécurité et IP bannies ───────────────
create table public.security_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null check (kind in ('refused', 'duplicate', 'denied', 'banned', 'unbanned', 'kicked')),
  protocol text check (protocol in ('srt', 'srtla', 'rtmp', 'cam')),
  ip inet,
  country text,
  relay_id uuid,  -- sans clé étrangère : un refus peut viser un relais supprimé entre-temps
  user_id uuid,   -- renseigné seulement pour une alerte montrée au propriétaire (effacé avec le compte, par le Core)
  detail jsonb not null default '{}'
);
create index security_events_at on public.security_events (at desc);
create index security_events_alerts on public.security_events (user_id, at desc) where user_id is not null;
alter table public.security_events enable row level security;
revoke all on public.security_events from anon, authenticated;

create table public.ip_bans (
  ip inet primary key,
  until timestamptz not null,
  reason text not null,
  auto boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.ip_bans enable row level security;
revoke all on public.ip_bans from anon, authenticated;

-- Purge : journal gardé 90 jours, bannissements expirés supprimés.
create function public.security_purge() returns void
language sql security definer set search_path = '' as $$
  delete from public.security_events where at < now() - interval '90 days';
  delete from public.ip_bans where until < now() - interval '1 day';
$$;
revoke execute on function public.security_purge() from public, anon, authenticated;
grant execute on function public.security_purge() to service_role;
