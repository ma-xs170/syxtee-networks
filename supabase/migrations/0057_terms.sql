-- Acceptation des conditions (CGU + CGV) : version acceptée par chaque compte.
-- Les comptes existants sont considérés comme ayant accepté la version en cours ; les nouveaux (dont les comptes créés par l'équipe)
-- la valident à leur première visite, et tout le monde à chaque nouvelle version (TERMS_VERSION dans src/lib/terms.ts).
alter table public.profiles add column terms_version text, add column terms_accepted_at timestamptz;
update public.profiles set terms_version = '2026-10-11', terms_accepted_at = now() where terms_version is null;
