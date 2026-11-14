-- Jeton de renouvellement des appareils Link : l'ancien reste valable 10 minutes après la rotation.
-- Si la réponse du Core se perd (réseau coupé, OBS fermé), le poste présente encore l'ancien jeton :
-- sans cette tolérance il était refusé et le compte se déconnectait pour de bon.
alter table public.link_devices
  add column if not exists prev_refresh_hash text,
  add column if not exists prev_refresh_until timestamptz;
create index if not exists link_devices_prev_refresh_idx on public.link_devices (prev_refresh_hash) where prev_refresh_hash is not null;
