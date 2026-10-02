-- Le serveur de relais passe de New York (nyc1) à Beauharnois, Canada (bhs1).
-- À appliquer en même temps que RELAY_NAME=bhs1 dans /opt/syxtee/.env du nouveau serveur, puis redémarrer le Core :
-- le Core ne lit que les relais dont `server` vaut son RELAY_NAME.
alter table public.relays alter column server set default 'bhs1';
update public.relays set server = 'bhs1' where server = 'nyc1';
update public.live_sessions set relay = 'bhs1' where relay = 'nyc1';
