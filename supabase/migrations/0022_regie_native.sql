-- La mire de coupure (régie) est native : tous les relais passent par elle quand la régie est activée sur le serveur.
-- Le Core ignore désormais `mode` ; on aligne la base pour que les relais existants et nouveaux soient cohérents.
alter table public.relays alter column mode set default 'regie';
update public.relays set mode = 'regie' where mode = 'direct';
