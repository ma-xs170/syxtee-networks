# Abonnements Stripe (formule Payant)

Validé avec l'utilisateur le 2026-09-30.

## Décisions

- Une formule vendue : **Payant** (3 relais, 3 flux simultanés, toutes les fonctions).
- Deux prix TTC, en EUR : **9,99 € / mois** et **99 € / an** (2 mois offerts). Pas d'essai gratuit.
- Vendeur : association, **pas de TVA**. Pas de Stripe Tax (`automatic_tax` désactivé). La mention d'exonération est ajoutée par l'utilisateur dans le pied des factures Stripe.
- Compte Stripe **activé** (mode live). Développement et tests : sandbox Stripe.
- Approche : **Stripe Checkout hébergé** (`mode: "subscription"`) + **Customer Portal** + **webhook**.
- Partenaire, Bêta et Admin : attribués par l'admin seulement, jamais touchés par Stripe. Ces comptes ne voient pas « S'abonner ».

## Données (`0019_billing.sql`)

- `profiles` : `stripe_customer_id` (unique), `stripe_subscription_id`, `billing_interval` (`month` | `year`), `billing_status` (statut Stripe de l'abonnement), `cancel_at_period_end`, `billing_period_end`. Écriture : clé secrète serveur uniquement (aucun droit `authenticated`).
- `stripe_events (id text primary key, type, received_at)` : idempotence des webhooks.
- `billing_payments (invoice_id primary key, user_id, amount_cents, currency, interval, paid_at, refunded_cents)` : base de la page Revenus, sans clé de lecture Stripe.

## Règle de synchronisation

L'abonnement Stripe décide de la formule, via `applyBillingEvent` (`plan-admin.ts`) :

| Statut Stripe | Formule | `plan_until` |
|---|---|---|
| `active`, `past_due` | Payant | fin de période + 2 jours |
| `canceled`, `unpaid`, `incomplete_expired` | inchangée jusqu'à l'échéance, puis la tâche quotidienne repasse en Gratuit | fin de période (déjà posée) |
| `incomplete` | aucun changement | |

- La fin de période est lue sur l'élément d'abonnement (`items.data[0].current_period_end`), comme l'impose l'API récente.
- Compte en Partenaire, Bêta ou Admin : seules les colonnes `billing_*` sont mises à jour, la formule ne change pas.
- Le rappel « ta formule se termine dans 7 jours » n'est pas envoyé à un abonnement actif non résilié.

## Parcours

- `/dashboard/abonnement` :
  - en Gratuit : cartes Mensuel et Annuel, bouton « S'abonner » (server action qui crée le client Stripe si besoin, enregistre `stripe_customer_id`, puis crée la session Checkout) ;
  - en Payant : périodicité, prochain prélèvement ou « Accès jusqu'au », bouton « Gérer mon abonnement » (session du portail) ;
  - en Partenaire, Bêta ou Admin : « Ta formule inclut déjà tout ».
- Checkout : case obligatoire (CGV + démarrage immédiat, renonciation au délai de rétractation).
- Retour `?paiement=ok` : « Paiement reçu, activation… », rafraîchi toutes les 2 s jusqu'au passage en Payant. Le retour n'active jamais rien.
- `/offres` affiche les prix. Nouvelle page `/cgv`, à faire relire par l'utilisateur.

## Webhook `/api/stripe/webhook`

- Signature vérifiée (`STRIPE_WEBHOOK_SECRET`), sinon `400`. Événement déjà vu : `200` sans rien faire.
- Compte retrouvé par `stripe_customer_id` (lien posé avant le paiement), jamais par des métadonnées.
- `checkout.session.completed`, `customer.subscription.created | updated | deleted` : colonnes `billing_*` + formule.
- `invoice.paid` : ligne `billing_payments`. `invoice.payment_failed` : email « Paiement échoué » avec lien vers le portail. `charge.refunded` : met à jour `refunded_cents`.
- Tout changement de formule passe au journal admin avec l'acteur « stripe ». Erreur interne : `500`, Stripe renvoie l'événement plus tard.
- Le traitement n'appelle pas l'API Stripe : il lit les objets contenus dans les événements, et reste testable hors ligne.

## Admin

- Revenus : chiffre d'affaires du mois, MRR (mensuels + annuels / 12), remboursements, historique sur 12 mois, calculés depuis `billing_payments` et `profiles`.
- Fiche compte : état de l'abonnement, lien vers le client dans le tableau de bord Stripe. Avertissement si l'admin met en Partenaire un compte qui a un abonnement actif.

## Clés (Vercel, variables sensibles)

- `STRIPE_SECRET_KEY` : clé **restreinte** `rk_…`. Customers : écriture. Checkout Sessions : écriture. Customer portal : écriture. Subscriptions, Invoices, Prices : lecture.
- `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`.

## Tests

- e2e (`e2e/billing.spec.ts`) : faux événements signés envoyés au webhook, sur le projet Supabase de test (abonnement, renouvellement, échec, résiliation, doublon, signature invalide, Partenaire intact), et affichage de la page Abonnement pour chaque état.
- Parcours réel avec carte de test dans le sandbox Stripe, avant la mise en live.
