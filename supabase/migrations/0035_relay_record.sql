-- SYXTEE : enregistrement du flux d'un relais sur le serveur (10 Go par compte, fichiers MP4 gérés par le Core).
-- Option par relais, désactivée par défaut. À appliquer AVANT de déployer le Core qui lit cette colonne.

alter table public.relays add column if not exists record boolean not null default false;
