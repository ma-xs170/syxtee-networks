-- Rapport de direct partageable : un jeton secret par direct, à la demande du propriétaire.
-- La page publique /direct/<jeton> lit la ligne avec la clé secrète du site (jamais avec une clé publique) ; sans jeton, le direct reste privé.

alter table public.live_sessions add column share_token text;

create unique index live_sessions_share_token on public.live_sessions (share_token) where share_token is not null;
