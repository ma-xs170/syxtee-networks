-- SYXTEE : l'enregistrement du flux est activé par défaut sur chaque relais (le membre peut toujours le couper).
-- Les relais existants sont activés aussi. Le quota de 10 Go par compte reste la limite.

alter table public.relays alter column record set default true;
update public.relays set record = true where record = false;
