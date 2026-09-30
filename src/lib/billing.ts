// Abonnement Stripe → formule : règles pures (sans Stripe ni base), partagées par le webhook, les pages et les tests.

export type Interval = "month" | "year";

/** Prix affichés (TTC, pas de TVA : association). Les montants facturés viennent des Prices Stripe. */
export const PRICES: Record<Interval, { label: string; amount: string; cents: number; per: string; note?: string }> = {
  month: { label: "Mensuel", amount: "9,99 €", cents: 999, per: "par mois" },
  year: { label: "Annuel", amount: "99 €", cents: 9900, per: "par an", note: "2 mois offerts" },
};

/** Revenu mensuel récurrent (centimes) : mensuels + annuels / 12. */
export const mrrCents = (monthly: number, yearly: number) => Math.round(monthly * PRICES.month.cents + (yearly * PRICES.year.cents) / 12);

/** Marge après la fin de période : couvre le délai entre l'échéance et le webhook du renouvellement. */
export const GRACE_MS = 2 * 86_400_000;

/** Statuts où l'abonné garde l'accès (past_due : Stripe réessaie le prélèvement). */
const LIVE = new Set(["active", "trialing", "past_due"]);
/** Statuts terminaux : l'abonnement ne reviendra pas. */
const ENDED = new Set(["canceled", "unpaid", "incomplete_expired"]);
/** Formules attribuées par l'admin : jamais modifiées par Stripe. */
const MANUAL = new Set(["partner", "beta", "admin"]);

export type SubscriptionView = { status: string; periodEnd: number | null };
export type Decision = { kind: "none" } | { kind: "paid"; until: Date } | { kind: "free" };

/**
 * Formule à appliquer pour un abonnement (fin de période en secondes Unix, comme Stripe).
 * - actif ou en relance : Payant jusqu'à la fin de période + 2 jours ;
 * - terminé : Gratuit tout de suite, seulement si le compte est en Payant ;
 * - incomplet (paiement initial en cours) ou formule manuelle : rien.
 */
export function decide(sub: SubscriptionView, currentPlan: string | null | undefined): Decision {
  if (MANUAL.has(currentPlan ?? "")) return { kind: "none" };
  if (LIVE.has(sub.status) && sub.periodEnd) return { kind: "paid", until: new Date(sub.periodEnd * 1000 + GRACE_MS) };
  if (ENDED.has(sub.status) && currentPlan === "paid") return { kind: "free" };
  return { kind: "none" };
}

/** Abonnement qui se renouvelle tout seul : pas de rappel « ta formule se termine dans 7 jours ». */
export const renews = (p: { billing_status?: string | null; cancel_at_period_end?: boolean | null }) =>
  LIVE.has(p.billing_status ?? "") && !p.cancel_at_period_end;

/** Un compte peut ouvrir un paiement : pas de formule manuelle, pas d'abonnement déjà vivant. */
export const canSubscribe = (p: { plan?: string | null; billing_status?: string | null }) => !MANUAL.has(p.plan ?? "") && !LIVE.has(p.billing_status ?? "");
