-- Chaînes de l'accueil ajoutées à la main : photo envoyée depuis /admin/chaines (bucket public « avatars », dossier featured/).
-- L'accueil l'utilise en priorité ; sans elle, il retombe sur la photo Twitch (API) puis sur l'initiale.
alter table public.featured_channels add column if not exists avatar_url text;
