-- SYXTEE : abonnements Stripe (formule Payant, 9,99 €/mois ou 99 €/an).
-- À exécuter sur le projet de production ET sur le projet de test, après 0018.
--
-- Tout est écrit par le serveur (clé secrète) : webhook Stripe et server actions. Aucun droit pour les comptes.
-- L'utilisateur lit ses propres colonnes billing_* via la policy « Lire son profil » (0001).

alter table public.profiles
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text,
  add column billing_interval text check (billing_interval in ('month', 'year')),
  -- Statut Stripe de l'abonnement (active, past_due, canceled, unpaid, incomplete…), null sans abonnement.
  add column billing_status text,
  add column cancel_at_period_end boolean not null default false,
  add column billing_period_end timestamptz;

-- Webhooks déjà traités : Stripe peut envoyer deux fois le même événement.
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

-- Paiements encaissés (factures payées) : base de la page admin Revenus.
create table public.billing_payments (
  invoice_id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null,
  interval text check (interval in ('month', 'year')),
  paid_at timestamptz not null
);
create index billing_payments_paid_at on public.billing_payments (paid_at desc);
alter table public.billing_payments enable row level security;
revoke all on public.billing_payments from anon, authenticated;
