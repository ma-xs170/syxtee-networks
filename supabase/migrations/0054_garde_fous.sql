-- Garde-fous de production : index des recherches fréquentes + journal des erreurs.
-- Sans risque à rejouer (if not exists). Aucun changement de données.

-- ───── Index (12) ─────
-- Webhook Stripe : retrouver le compte d'un client Stripe à chaque événement.
create index if not exists profiles_stripe_customer on public.profiles (stripe_customer_id) where stripe_customer_id is not null;
-- Admin : liste des comptes triée par date d'inscription, filtre par formule, abonnements à échéance (tâche quotidienne).
create index if not exists profiles_created_at on public.profiles (created_at desc);
create index if not exists profiles_plan on public.profiles (plan, plan_until);
-- Admin : « En ligne » / dernière activité.
create index if not exists profiles_last_seen on public.profiles (last_seen_at desc) where last_seen_at is not null;
-- Vitrine de l'accueil (vue public_streamers) : comptes qui acceptent d'y figurer.
create index if not exists profiles_on_site on public.profiles (show_on_site_at) where show_on_site and twitch_id is not null;
-- Paiements d'un compte (fiche admin, revenus).
create index if not exists billing_payments_user on public.billing_payments (user_id, paid_at desc);
-- Commande : empêche de créer deux fois les codes d'une même commande et accélère la vérification.
create index if not exists encoder_codes_order on public.encoder_activation_codes (order_ref) where order_ref is not null;
-- Admin : dernières notifications envoyées.
create index if not exists notifications_created on public.notifications (created_at desc);

-- ───── Journal des erreurs (18) ─────
-- Une ligne par erreur distincte (empreinte) : `count` et `last_at` montent quand elle se répète.
-- Écrit par le serveur (clé secrète) ; aucune lecture publique.
create table if not exists public.error_logs (
  id bigint generated always as identity primary key,
  fingerprint text not null unique,
  source text not null check (source in ('server', 'client', 'action', 'route')),
  message text not null check (char_length(message) <= 600),
  digest text,
  path text,
  method text,
  user_agent text,
  count integer not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);
create index if not exists error_logs_last on public.error_logs (last_at desc);
alter table public.error_logs enable row level security;
revoke all on public.error_logs from anon, authenticated;

-- Enregistre une erreur (ou en incrémente le compteur) en un seul appel atomique.
create or replace function public.log_error(p_fingerprint text, p_source text, p_message text, p_digest text, p_path text, p_method text, p_user_agent text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.error_logs (fingerprint, source, message, digest, path, method, user_agent)
  values (p_fingerprint, p_source, left(p_message, 600), p_digest, left(p_path, 300), p_method, left(p_user_agent, 200))
  on conflict (fingerprint) do update set count = public.error_logs.count + 1, last_at = now();
  -- Ménage occasionnel : rien n'est gardé plus de 30 jours.
  if random() < 0.01 then
    delete from public.error_logs where last_at < now() - interval '30 days';
  end if;
end $$;
revoke execute on function public.log_error(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.log_error(text, text, text, text, text, text, text) to service_role;
