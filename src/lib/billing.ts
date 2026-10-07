// Abonnement Stripe → formule : règles pures (sans Stripe ni base), partagées par le webhook, les pages et les tests.

export type Interval = "month" | "year";
/** Formules vendues. `paid` = Premium (identifiant historique gardé). */
export type Tier = "basic" | "paid" | "extra";
export const TIERS: Tier[] = ["basic", "paid", "extra"];

type Price = { amount: string; cents: number };

/** Catalogue affiché (prix nets, pas de TVA : association). Les montants facturés viennent des Prices Stripe. */
export const CATALOG: Record<Tier, { name: string; pitch: string; points: string[]; prices: Record<Interval, Price>; featured?: boolean }> = {
  basic: {
    name: "Basique",
    pitch: "Pour démarrer : un flux fiable et le contrôle à distance.",
    points: ["1 flux SRTLA ou RTMP", "1 direct à la fois", "Contrôle à distance d'OBS", "Santé du flux"],
    prices: { month: { amount: "4,99 €", cents: 499 }, year: { amount: "49 €", cents: 4900 } },
  },
  paid: {
    name: "Premium",
    pitch: "Tout SYXTEE, pour streamer souvent.",
    points: ["10 flux, 5 par protocole", "3 directs en même temps", "3 invités au contrôle à distance", "Statistiques et historique des directs", "Sauvegardes de scènes et Multichat"],
    prices: { month: { amount: "9,99 €", cents: 999 }, year: { amount: "99 €", cents: 9900 } },
    featured: true,
  },
  extra: {
    name: "Extra",
    pitch: "Pour les équipes et les gros événements.",
    points: ["Flux illimités", "10 directs en même temps", "5 invités au contrôle à distance", "Toutes les fonctions Premium"],
    prices: { month: { amount: "19,99 €", cents: 1999 }, year: { amount: "199 €", cents: 19900 } },
  },
};

export const INTERVALS: Record<Interval, { label: string; per: string; note?: string }> = {
  month: { label: "Mensuel", per: "par mois" },
  year: { label: "Annuel", per: "par an", note: "2 mois offerts" },
};

export const isTier = (p: string | null | undefined): p is Tier => TIERS.includes(p as Tier);

/** Revenu mensuel récurrent (centimes) : abonnés actifs par formule et périodicité, annuels ramenés au mois. */
export function mrrCents(counts: Partial<Record<Tier, Partial<Record<Interval, number>>>>) {
  let total = 0;
  for (const t of TIERS) total += (counts[t]?.month ?? 0) * CATALOG[t].prices.month.cents + ((counts[t]?.year ?? 0) * CATALOG[t].prices.year.cents) / 12;
  return Math.round(total);
}

/** Marge après la fin de période : couvre le délai entre l'échéance et le webhook du renouvellement. */
export const GRACE_MS = 2 * 86_400_000;

/** Statuts où l'abonné garde l'accès (past_due : Stripe réessaie le prélèvement). */
const LIVE = new Set(["active", "trialing", "past_due"]);
/** Statuts terminaux : l'abonnement ne reviendra pas. */
const ENDED = new Set(["canceled", "unpaid", "incomplete_expired"]);
/** Formules attribuées par l'admin : jamais modifiées par Stripe. */
const MANUAL = new Set(["partner", "beta", "admin"]);

/** `tier` : formule du prix de l'abonnement (null : prix inconnu). */
export type SubscriptionView = { status: string; periodEnd: number | null; tier: Tier | null };
export type Decision = { kind: "none" } | { kind: "sub"; plan: Tier; until: Date } | { kind: "free" };

/**
 * Formule à appliquer pour un abonnement (fin de période en secondes Unix, comme Stripe).
 * - actif ou en relance : la formule du prix, jusqu'à la fin de période + 2 jours ;
 * - terminé : Gratuit tout de suite, seulement depuis une formule vendue ;
 * - incomplet (paiement initial en cours), prix inconnu ou formule manuelle : rien.
 */
export function decide(sub: SubscriptionView, currentPlan: string | null | undefined): Decision {
  if (MANUAL.has(currentPlan ?? "")) return { kind: "none" };
  if (LIVE.has(sub.status) && sub.periodEnd && sub.tier) return { kind: "sub", plan: sub.tier, until: new Date(sub.periodEnd * 1000 + GRACE_MS) };
  if (ENDED.has(sub.status) && isTier(currentPlan)) return { kind: "free" };
  return { kind: "none" };
}

/** Abonnement qui se renouvelle tout seul : pas de rappel « ta formule se termine dans 7 jours ». */
export const renews = (p: { billing_status?: string | null; cancel_at_period_end?: boolean | null }) =>
  LIVE.has(p.billing_status ?? "") && !p.cancel_at_period_end;

/** Un compte peut ouvrir un paiement : pas de formule manuelle, pas d'abonnement déjà vivant (changement : portail). */
export const canSubscribe = (p: { plan?: string | null; billing_status?: string | null }) => !MANUAL.has(p.plan ?? "") && !LIVE.has(p.billing_status ?? "");
