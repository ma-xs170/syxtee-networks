import type { NextRequest } from "next/server";
import { appUser, privateJson, redirectTarget, readJson } from "@/lib/auth/app-api";
import { isTier } from "@/lib/billing";
import { startCheckout } from "@/app/(dashboard)/dashboard/abonnement/actions";

// POST /api/app/billing/checkout { tier, interval } : adresse du paiement Stripe, à ouvrir dans le navigateur de l'iPhone.
export async function POST(request: NextRequest) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const b = (await readJson(request)) as { tier?: string; interval?: string } | null;
  if (!isTier(b?.tier) || (b?.interval !== "month" && b?.interval !== "year")) return privateJson({ error: "Formule inconnue." }, { status: 400 });
  const out = await redirectTarget(() => startCheckout(b.tier as "basic" | "paid" | "extra", b.interval as "month" | "year"));
  if ("redirect" in out) return privateJson({ url: out.redirect });
  return privateJson({ error: out.result.error ?? "Paiement indisponible." }, { status: 400 });
}
