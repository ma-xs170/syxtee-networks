-- SYXTEE : formules Gratuit / Payant / Partenaire, attribuées par l'admin (Prompt K).
-- À exécuter sur le projet de production ET sur le projet de test.
--
-- Comptes existants : restent en « beta » (accès complet, sans date de fin) ; l'admin les bascule un par un.
-- Nouveaux comptes : « free » (interface grisée, seul le Scanner / l'Analyseur est actif).

alter table public.profiles alter column plan set default 'free';

alter table public.profiles
  -- Fin de la formule (facultative) : au-delà, le compte est traité en Gratuit (site et Core), puis la tâche
  -- quotidienne repasse plan à 'free'.
  add column plan_until timestamptz,
  -- Note interne de l'admin (« Partenariat Saily », « Streamer ambassadeur »…). Jamais montrée au client.
  add column plan_note text check (char_length(plan_note) <= 200),
  -- Rappel « fin dans 7 jours » déjà envoyé pour cette échéance.
  add column plan_reminded_at timestamptz;

-- Colonnes de formule : serveur uniquement (les droits de mise à jour de 0001/0013 ne les incluent pas).

-- ─────────────── Journal d'audit des actions admin ───────────────
-- Lecture et écriture avec la clé secrète uniquement (pages /admin, côté serveur). Jamais modifié ni effacé.
create table public.admin_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  admin_email text not null,
  action text not null,
  target_user uuid,
  before jsonb,
  after jsonb
);
create index admin_audit_at on public.admin_audit (at desc);
create index admin_audit_target on public.admin_audit (target_user, at desc);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;

-- Journal en ajout seul, même avec la clé secrète : ni modification ni suppression.
create function public.admin_audit_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'admin_audit : journal en ajout seul';
end $$;
create trigger admin_audit_no_update before update or delete on public.admin_audit
  for each row execute function public.admin_audit_append_only();

-- Vue publique de l'accueil : badge « Partenaire » (formule en cours).
create or replace view public.public_streamers as
  select username, avatar_url, twitch_id, twitch_login, twitch_display_name,
    case when show_first_name then first_name end as first_name,
    (plan = 'partner' and (plan_until is null or plan_until > now())) as partner
  from public.profiles
  where show_on_site and twitch_id is not null;
