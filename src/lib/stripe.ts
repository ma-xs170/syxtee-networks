import "server-only";
import Stripe from "stripe";
import { PROD_TIERS, TIERS, type Interval, type PaidTier, type ProdTier } from "./billing";

// Client Stripe côté serveur. STRIPE_SECRET_KEY : clé RESTREINTE (rk_…) stockée en variable sensible Vercel.
// Droits : Customers (écriture), Checkout Sessions (écriture), Customer portal (écriture),
// Subscriptions, Invoices et Prices (lecture). Le webhook, lui, n'appelle pas l'API.
//
// Prix : STRIPE_PRICE_{BASIC|PREMIUM|EXTRA}_{MONTHLY|YEARLY} (6 identifiants price_…, un produit par formule).
// Un changement de tarif crée un nouveau Price Stripe : mets-le en premier (« price_nouveau,price_ancien »). Le premier sert au paiement,
// les suivants restent reconnus pour les abonnés qui gardent l'ancien tarif.

const ENV: Record<PaidTier, string> = { basic: "BASIC", paid: "PREMIUM", extra: "EXTRA", prod_s: "PROD_S", prod_m: "PROD_M", prod_l: "PROD_L" };
const envName = (t: PaidTier, i: Interval) => `STRIPE_PRICE_${ENV[t]}_${i === "year" ? "YEARLY" : "MONTHLY"}`;

const priceIds = (t: PaidTier, i: Interval) => (process.env[envName(t, i)] ?? "").split(",").map((x) => x.trim()).filter(Boolean);
export const priceId = (t: PaidTier, i: Interval) => priceIds(t, i)[0] ?? "";

export const hasStripe = !!process.env.STRIPE_SECRET_KEY && TIERS.every((t) => priceId(t, "month") && priceId(t, "year"));

/** Formule et périodicité d'un Price Stripe (null : prix inconnu de ce site). */
/** Les formules Production se vendent seulement quand leurs six prix sont déclarés (STRIPE_PRICE_PROD_{S|M|L}_{MONTHLY|YEARLY}). */
export const hasProductionPrices = hasStripe && PROD_TIERS.every((t) => priceId(t, "month") && priceId(t, "year"));
export const productionSellable = (t: ProdTier) => hasStripe && !!priceId(t, "month") && !!priceId(t, "year");

export function tierOfPrice(id: string | null | undefined): { tier: PaidTier; interval: Interval } | null {
  if (!id) return null;
  for (const tier of [...TIERS, ...PROD_TIERS]) for (const interval of ["month", "year"] as Interval[]) if (priceIds(tier, interval).includes(id)) return { tier, interval };
  return null;
}

let client: Stripe | null = null;
export function stripe() {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-08-26.dahlia", timeout: 15_000, maxNetworkRetries: 2 });
  return client;
}
