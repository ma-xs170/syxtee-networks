-- SYXTEE : format des enregistrements d'un relais. MOV par défaut (se lit partout sur Mac et Windows), MP4 au choix.
-- À appliquer AVANT de déployer le Core qui lit cette colonne.

alter table public.relays add column if not exists record_format text not null default 'mov' check (record_format in ('mov', 'mp4'));
