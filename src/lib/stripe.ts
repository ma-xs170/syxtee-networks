import "server-only";
import Stripe from "stripe";
import type { Interval } from "./billing";

// Client Stripe côté serveur. STRIPE_SECRET_KEY : clé RESTREINTE (rk_…) stockée en variable sensible Vercel.
// Droits : Customers (écriture), Checkout Sessions (écriture), Customer portal (écriture),
// Subscriptions, Invoices et Prices (lecture). Le webhook, lui, n'appelle pas l'API.

export const hasStripe = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_YEARLY);

let client: Stripe | null = null;
export function stripe() {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-08-26.dahlia" });
  return client;
}

export const priceId = (i: Interval) => (i === "year" ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY)!;

