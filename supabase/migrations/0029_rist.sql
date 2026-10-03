-- SYXTEE : 3e protocole d'entrée, RIST (Reliable Internet Stream Transport). Un relais RIST a son propre port UDP
-- (tiré dans la plage RIST_PORT_MIN..MAX du Core) ; le secret de chiffrement AES (profil Main) est chiffré avec les clés (keys_enc).
-- À appliquer AVANT de déployer le Core qui crée des relais RIST.

alter table public.relays drop constraint if exists relays_protocol_check;
alter table public.relays add constraint relays_protocol_check check (protocol in ('srtla', 'rtmp', 'rist'));

alter table public.relays add column if not exists rist_port integer check (rist_port between 1024 and 65535);
create unique index if not exists relays_rist_port on public.relays (server, rist_port) where rist_port is not null;

-- Journal de sécurité : le protocole RIST peut y figurer.
alter table public.security_events drop constraint if exists security_events_protocol_check;
alter table public.security_events add constraint security_events_protocol_check check (protocol in ('srt', 'srtla', 'rtmp', 'cam', 'rist'));
