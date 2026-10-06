-- Déclenchement de la bascule automatique (direct → scène de secours), par flux :
--   cut            coupure seulement (image figée ou flux coupé)
--   cut_lowbitrate coupure ou débit très bas
--   sensitive      plus réactif aux micro-coupures
-- Modifié depuis « Mes relais » (site) ou depuis le panneau Appareil du contrôle à distance ; lu par l'agent du plugin.
alter table public.relays
  add column if not exists switch_trigger text not null default 'cut'
  check (switch_trigger in ('cut', 'cut_lowbitrate', 'sensitive'));
