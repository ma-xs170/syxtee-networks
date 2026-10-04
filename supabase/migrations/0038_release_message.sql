-- Notes de version : identifiant du message Discord, pour le modifier depuis /admin/versions. À appliquer AVANT de déployer le site.
alter table public.releases add column if not exists discord_message_id text;
alter table public.releases add column if not exists updated_at timestamptz;
