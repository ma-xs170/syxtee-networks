-- SYXTEE : emails de compte (bienvenue une seule fois, alerte « nouvel appareil »).
-- À exécuter sur le projet de production ET sur le projet de test.

-- Email de bienvenue : envoyé une fois, après la vérification de l'adresse.
alter table public.profiles add column welcomed_at timestamptz;

-- Appareils déjà vus par compte (empreinte d'un cookie aléatoire, jamais l'IP). Serveur uniquement.
create table private.known_devices (
  user_id uuid not null references auth.users (id) on delete cascade,
  device_hash text not null,
  user_agent text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (user_id, device_hash)
);

-- 'first' : premier appareil du compte (pas d'alerte) · 'known' : déjà vu · 'new' : nouvel appareil (alerte).
create function public.device_seen(p_user uuid, p_device text, p_user_agent text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  existed boolean;
  any_device boolean;
begin
  select exists (select 1 from private.known_devices where user_id = p_user and device_hash = p_device) into existed;
  if existed then
    update private.known_devices set last_seen = now() where user_id = p_user and device_hash = p_device;
    return 'known';
  end if;
  select exists (select 1 from private.known_devices where user_id = p_user) into any_device;
  insert into private.known_devices (user_id, device_hash, user_agent) values (p_user, p_device, left(p_user_agent, 300));
  -- Au plus 20 appareils gardés par compte (les plus anciens partent).
  delete from private.known_devices where user_id = p_user and device_hash in (
    select device_hash from private.known_devices where user_id = p_user order by last_seen desc offset 20
  );
  return case when any_device then 'new' else 'first' end;
end $$;

revoke execute on function public.device_seen(uuid, text, text) from public, anon, authenticated;
grant execute on function public.device_seen(uuid, text, text) to service_role;

-- Bienvenue : pose welcomed_at une seule fois ; vrai seulement au premier appel (évite deux envois).
create function public.mark_welcomed(p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set welcomed_at = now() where id = p_user and welcomed_at is null;
  return found;
end $$;

revoke execute on function public.mark_welcomed(uuid) from public, anon, authenticated;
grant execute on function public.mark_welcomed(uuid) to service_role;
