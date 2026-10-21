-- SYXTEE : stabilité du flux d'un relais = taille du tampon SRT (low 300 ms, balanced 1 s, max 2,5 s).
-- Le Core met ce délai dans l'adresse de lecture d'OBS et dans l'entrée de la régie.
-- À appliquer AVANT de déployer le Core qui lit cette colonne.

alter table public.relays add column if not exists stability text not null default 'low' check (stability in ('low', 'balanced', 'max'));
