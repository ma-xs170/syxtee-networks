import "server-only";
import Stripe from "stripe";
import { TIERS, type Interval, type Tier } from "./billing";

// Client Stripe côté serveur. STRIPE_SECRET_KEY : clé RESTREINTE (rk_…) stockée en variable sensible Vercel.
// Droits : Customers (écriture), Checkout Sessions (écriture), Customer portal (écriture),
// Subscriptions, Invoices et Prices (lecture). Le webhook, lui, n'appelle pas l'API.
//
// Prix : STRIPE_PRICE_{BASIC|PREMIUM|EXTRA}_{MONTHLY|YEARLY} (6 identifiants price_…, un produit par formule).

const ENV: Record<Tier, string> = { basic: "BASIC", paid: "PREMIUM", extra: "EXTRA" };
const envName = (t: Tier, i: Interval) => `STRIPE_PRICE_${ENV[t]}_${i === "year" ? "YEARLY" : "MONTHLY"}`;

export const priceId = (t: Tier, i: Interval) => process.env[envName(t, i)] ?? "";

export const hasStripe = !!process.env.STRIPE_SECRET_KEY && TIERS.every((t) => priceId(t, "month") && priceId(t, "year"));

/** Formule et périodicité d'un Price Stripe (null : prix inconnu de ce site). */
export function tierOfPrice(id: string | null | undefined): { tier: Tier; interval: Interval } | null {
  if (!id) return null;
  for (const tier of TIERS) for (const interval of ["month", "year"] as Interval[]) if (priceId(tier, interval) === id) return { tier, interval };
  return null;
}

let client: Stripe | null = null;
export function stripe() {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-08-26.dahlia" });
  return client;
}
