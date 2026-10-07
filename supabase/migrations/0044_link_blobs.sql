-- Sauvegardes de scènes légères : stockage par contenu.
-- Chaque fichier (média, collection) est identifié par son SHA-256 et stocké UNE SEULE FOIS par compte, partagé entre versions et collections.
-- Une version n'est plus qu'un manifeste (collection + liste de hachages). Le quota compte les octets UNIQUES réellement stockés.
-- Les fichiers eux-mêmes sont sur le disque du Core ; cette table ne garde que leurs métadonnées (écrite par le Core seulement).
create table public.link_blobs (
  user_id uuid not null references auth.users (id) on delete cascade,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size bigint not null check (size >= 0),          -- taille du fichier d'origine
  stored_size bigint not null check (stored_size >= 0), -- octets sur le disque (compressé si compressible)
  encoding text not null default 'raw' check (encoding in ('raw', 'gzip')),
  created_at timestamptz not null default now(),
  primary key (user_id, sha256)
);
alter table public.link_blobs enable row level security;
revoke all on public.link_blobs from anon, authenticated;
grant select on public.link_blobs to authenticated;
create policy link_blobs_own_read on public.link_blobs for select to authenticated using (user_id = (select auth.uid()));

-- Versions : format 1 = archive .tgz entière (ancien), format 2 = manifeste + fichiers partagés.
alter table public.link_backups
  add column format integer not null default 1 check (format in (1, 2)),
  add column manifest jsonb,                         -- format 2 : collection, fichiers (sha256, taille, nom)
  add column new_bytes bigint not null default 0;    -- octets que cette version a ajoutés au quota (format 2)
