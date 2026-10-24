// Abonnement Stripe → formule : règles pures (sans Stripe ni base), partagées par le webhook, les pages et les tests.

export type Interval = "month" | "year";
/** Formules vendues. `paid` = Signature (identifiant historique gardé). */
export type Tier = "basic" | "paid" | "extra";
export const TIERS: Tier[] = ["basic", "paid", "extra"];

type Price = { amount: string; cents: number };

/** Catalogue affiché (prix nets, pas de TVA : association). Les montants facturés viennent des Prices Stripe. */
export const CATALOG: Record<Tier, { name: string; pitch: string; points: string[]; prices: Record<Interval, Price>; featured?: boolean }> = {
  basic: {
    name: "Essentiel",
    pitch: "Le point de départ d'un direct maîtrisé.",
    points: ["1 connexion SRTLA", "1 direct à la fois", "Santé du flux", "Secours automatique et garde audio"],
    prices: { month: { amount: "5 €", cents: 500 }, year: { amount: "50 €", cents: 5000 } },
  },
  paid: {
    name: "Signature",
    pitch: "Pour les créateurs qui diffusent régulièrement.",
    points: ["10 connexions SRTLA", "3 directs en même temps", "Contrôle à distance d'OBS, multistream inclus", "3 invités au contrôle à distance", "Statistiques et historique des directs", "Sauvegardes de scènes et Multichat", "Autogérance des prises et régie IA (3 caméras)"],
    prices: { month: { amount: "10 €", cents: 1000 }, year: { amount: "100 €", cents: 10000 } },
    featured: true,
  },
  extra: {
    name: "Prestige",
    pitch: "Pour les régies et les équipes exigeantes.",
    points: ["Serveurs illimités", "10 directs en même temps", "5 invités au contrôle à distance", "Régie IA jusqu'à 6 caméras", "Toutes les fonctions Signature"],
    prices: { month: { amount: "19,99 €", cents: 1999 }, year: { amount: "199 €", cents: 19900 } },
  },
};

export const INTERVALS: Record<Interval, { label: string; per: string; note?: string }> = {
  month: { label: "Mensuel", per: "par mois" },
  year: { label: "Annuel", per: "par an", note: "2 mois offerts" },
};

export const isTier = (p: string | null | undefined): p is Tier => TIERS.includes(p as Tier);

/** Formules Production (équipes) : un espace partagé avec un nombre de streamers (un relais chacun) et de vidéastes. */
export type ProdTier = "prod_s" | "prod_m" | "prod_l";
export const PROD_TIERS: ProdTier[] = ["prod_s", "prod_m", "prod_l"];
export type PaidTier = Tier | ProdTier;

export const PRODUCTION: Record<ProdTier, { name: string; pitch: string; streamers: number; videographers: number; points: string[]; prices: Record<Interval, Price>; featured?: boolean }> = {
  prod_s: {
    name: "Production S",
    pitch: "Une petite équipe qui diffuse ensemble.",
    streamers: 5,
    videographers: 2,
    points: ["5 streamers, un relais chacun", "2 vidéastes", "Planning partagé de l'équipe", "Toutes les fonctions Signature"],
    prices: { month: { amount: "49 €", cents: 4900 }, year: { amount: "490 €", cents: 49000 } },
  },
  prod_m: {
    name: "Production M",
    pitch: "Une production avec plusieurs directs en parallèle.",
    streamers: 15,
    videographers: 5,
    points: ["15 streamers, un relais chacun", "5 vidéastes", "Planning partagé de l'équipe", "Régie IA jusqu'à 6 caméras"],
    prices: { month: { amount: "99 €", cents: 9900 }, year: { amount: "990 €", cents: 99000 } },
    featured: true,
  },
  prod_l: {
    name: "Production L",
    pitch: "Pour les agences et les grands événements.",
    streamers: 40,
    videographers: 15,
    points: ["40 streamers, un relais chacun", "15 vidéastes", "Planning partagé de l'équipe", "Régie IA jusqu'à 6 caméras"],
    prices: { month: { amount: "199 €", cents: 19900 }, year: { amount: "1 990 €", cents: 199000 } },
  },
};

export const isProdTier = (p: string | null | undefined): p is ProdTier => PROD_TIERS.includes(p as ProdTier);
export const isPaidTier = (p: string | null | undefined): p is PaidTier => isTier(p) || isProdTier(p);
/** Prix en centimes d'une formule vendue, pour la périodicité donnée. */
export const priceCents = (t: PaidTier, i: Interval) => (isProdTier(t) ? PRODUCTION[t].prices[i].cents : CATALOG[t].prices[i].cents);

/** Revenu mensuel récurrent (centimes) : abonnés actifs par formule et périodicité, annuels ramenés au mois. */
export function mrrCents(counts: Partial<Record<PaidTier, Partial<Record<Interval, number>>>>) {
  let total = 0;
  for (const t of [...TIERS, ...PROD_TIERS]) total += (counts[t]?.month ?? 0) * priceCents(t, "month") + ((counts[t]?.year ?? 0) * priceCents(t, "year")) / 12;
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
export type SubscriptionView = { status: string; periodEnd: number | null; tier: PaidTier | null };
export type Decision = { kind: "none" } | { kind: "sub"; plan: PaidTier; until: Date } | { kind: "free" };

/**
 * Formule à appliquer pour un abonnement (fin de période en secondes Unix, comme Stripe).
 * - actif ou en relance : la formule du prix, jusqu'à la fin de période + 2 jours ;
 * - terminé : Gratuit tout de suite, seulement depuis une formule vendue ;
 * - incomplet (paiement initial en cours), prix inconnu ou formule manuelle : rien.
 */
export function decide(sub: SubscriptionView, currentPlan: string | null | undefined): Decision {
  if (MANUAL.has(currentPlan ?? "")) return { kind: "none" };
  if (LIVE.has(sub.status) && sub.periodEnd && sub.tier) return { kind: "sub", plan: sub.tier, until: new Date(sub.periodEnd * 1000 + GRACE_MS) };
  if (ENDED.has(sub.status) && isPaidTier(currentPlan)) return { kind: "free" };
  return { kind: "none" };
}

/** Abonnement qui se renouvelle tout seul : pas de rappel « ta formule se termine dans 7 jours ». */
export const renews = (p: { billing_status?: string | null; cancel_at_period_end?: boolean | null }) =>
  LIVE.has(p.billing_status ?? "") && !p.cancel_at_period_end;

/** Un compte peut ouvrir un paiement : pas de formule manuelle, pas d'abonnement déjà vivant (changement : portail). */
export const canSubscribe = (p: { plan?: string | null; billing_status?: string | null }) => !MANUAL.has(p.plan ?? "") && !LIVE.has(p.billing_status ?? "");
