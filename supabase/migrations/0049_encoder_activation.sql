-- SYXTEE : codes d'activation de l'Encodeur. Chaque boîtier vendu s'accompagne d'un code à usage unique qui offre des mois de
-- l'abonnement le plus élevé (Extra) au compte qui l'active. Un code ne peut servir que sur UN compte, et seulement une fois.
-- À exécuter sur le projet de production ET sur le projet de test.

create table if not exists public.encoder_activation_codes (
  -- Format XXXX-XXXX-XXXX (lettres majuscules et chiffres).
  code text primary key check (code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  months integer not null default 4 check (months between 1 and 24),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  -- Référence de la commande (session Stripe) ou note de l'équipe.
  order_ref text,
  -- Si renseigné : seul ce compte (l'acheteur) peut activer le code.
  buyer_id uuid references auth.users (id) on delete set null,
  -- Compte qui l'a activé : une fois posé, le code est consommé.
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);
alter table public.encoder_activation_codes enable row level security;
revoke all on public.encoder_activation_codes from anon, authenticated;
create index if not exists encoder_codes_buyer on public.encoder_activation_codes (buyer_id) where buyer_id is not null;
create index if not exists encoder_codes_used on public.encoder_activation_codes (used_by) where used_by is not null;
