-- Fuseau horaire du compte (région choisie à l'inscription, modifiable dans le profil).
-- Sert au « Bonjour / Bon après-midi / Bonne soirée » et à l'heure de la vue d'ensemble.
-- Vide = Europe/Paris côté application.
alter table public.profiles add column if not exists timezone text check (char_length(timezone) between 3 and 64);

grant update (timezone) on public.profiles to authenticated;
