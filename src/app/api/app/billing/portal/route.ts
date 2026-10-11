import { appUser, privateJson, redirectTarget } from "@/lib/auth/app-api";
import { openPortal } from "@/app/(dashboard)/dashboard/abonnement/actions";

// POST /api/app/billing/portal : adresse du portail client Stripe (factures, moyen de paiement, résiliation).
export async function POST() {
  const u = await appUser();
  if (u instanceof Response) return u;
  const out = await redirectTarget(() => openPortal());
  if ("redirect" in out) return privateJson({ url: out.redirect });
  return privateJson({ error: out.result.error ?? "Portail indisponible." }, { status: 400 });
}
