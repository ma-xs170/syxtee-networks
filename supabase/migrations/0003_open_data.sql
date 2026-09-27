-- Données ouvertes republiées par SYXTEE (carte des antennes /antennes) : lecture publique.
-- Écriture uniquement par le serveur (clé secrète, qui contourne les règles d'accès) : aucune règle d'écriture ici.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('open-data', 'open-data', true, 10485760, array['application/json'])
on conflict (id) do nothing;
