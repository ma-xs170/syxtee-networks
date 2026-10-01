-- SYXTEE : trois formules vendues (Basique, Premium, Extra). Premium garde l'identifiant historique « paid ».
-- À exécuter sur le projet de production ET sur le projet de test, après 0019.
-- Ordre de mise en ligne : Core redéployé d'abord (il connaît basic et extra), puis cette migration, puis le site.

alter table public.profiles drop constraint profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'basic', 'beta', 'paid', 'extra', 'partner', 'admin'));
