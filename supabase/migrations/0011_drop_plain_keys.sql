-- SYXTEE : suppression des clés de relais en clair.
-- À appliquer APRÈS le premier démarrage du Core 0010 (il chiffre les clés existantes et vide ces colonnes).
-- Échoue volontairement si une ligne n'a pas encore été chiffrée.

do $$
begin
  if exists (select 1 from public.relays where keys_enc is null) then
    raise exception 'Des relais ont encore leurs clés en clair : démarrer le Core (chiffrement) avant cette migration.';
  end if;
end $$;

alter table public.relays drop constraint relays_keys_present;
alter table public.relays
  drop column publish_id,
  drop column play_id,
  drop column out_publish_id,
  drop column out_play_id,
  drop column cam_key;

alter table public.relays
  alter column keys_enc set not null,
  alter column publish_hash set not null,
  alter column play_hash set not null,
  alter column out_publish_hash set not null,
  alter column out_play_hash set not null;

-- Ancienne table des clés (une paire par compte), obsolète depuis 0008 et encore en clair.
drop table public.stream_keys;
