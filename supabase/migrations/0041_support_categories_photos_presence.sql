-- Support : catégories, photos dans les messages ; présence : dernière activité des comptes.

-- Catégorie choisie à l'ouverture de la demande (la boîte admin filtre dessus, une pastille par catégorie).
alter table public.support_tickets
  add column if not exists category text not null default 'autre'
  check (category in ('relais', 'compte', 'facturation', 'bug', 'suggestion', 'autre'));
create index if not exists support_tickets_category on public.support_tickets (category, status, last_from);

-- Photos : chemins dans le bucket privé « support » (lues par URL signée, côté serveur uniquement).
-- Un message peut ne contenir qu'une photo : le texte devient facultatif.
alter table public.support_messages add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.support_messages drop constraint if exists support_messages_body_check;
alter table public.support_messages add constraint support_messages_body_check check (char_length(body) between 0 and 4000);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support', 'support', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Présence : un battement toutes les minutes tant que le dashboard est ouvert (en ligne = vu il y a moins de 2 min).
alter table public.profiles add column if not exists last_seen_at timestamptz;
