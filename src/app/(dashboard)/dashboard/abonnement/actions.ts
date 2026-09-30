"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { canSubscribe, type Interval } from "@/lib/billing";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { hasStripe, priceId, stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Abonnement : ouverture de Stripe Checkout (paiement) et du portail client (gestion). Aucune activation ici :
// seule la réception du webhook fait passer le compte en Payant.

export type BillingState = { error?: string };

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

/** Client Stripe du compte, créé et enregistré au premier paiement (lien posé AVANT le paiement). */
async function customerFor(user: { id: string; email?: string | null }, name: string | null, existing: string | null | undefined) {
  if (existing) return existing;
  const db = createAdminClient();
  const created = await stripe().customers.create({ email: user.email ?? undefined, name: name ?? undefined, metadata: { user_id: user.id } });
  // Double clic : seul le premier client créé est gardé.
  await db.from("profiles").update({ stripe_customer_id: created.id }).eq("id", user.id).is("stripe_customer_id", null);
  const { data } = await db.from("profiles").select("stripe_customer_id").eq("id", user.id).single<{ stripe_customer_id: string }>();
  return data?.stripe_customer_id ?? created.id;
}

export async function startCheckout(interval: Interval): Promise<BillingState> {
  const user = await requireUser("/dashboard/abonnement");
  if (!hasStripe) return { error: "Le paiement n'est pas encore ouvert. Réessaie bientôt." };
  if (interval !== "month" && interval !== "year") return { error: "Formule inconnue." };
  const profile = await getProfile();
  if (!profile) return { error: "Profil introuvable. Recharge la page." };
  if (!canSubscribe(profile)) return { error: "Ton compte a déjà un abonnement ou une formule qui inclut tout." };

  const base = await origin();
  let url: string | null;
  try {
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null;
    const customer = await customerFor(user, name, profile.stripe_customer_id);
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: user.id,
      line_items: [{ price: priceId(interval), quantity: 1 }],
      locale: "fr",
      // Service numérique démarré tout de suite : accord exprès et renonciation au délai de rétractation.
      consent_collection: { terms_of_service: "required" },
      custom_text: {
        terms_of_service_acceptance: {
          message: `J'accepte les [CGV](${base}/cgv) et je demande l'accès immédiat au service : je renonce à mon droit de rétractation de 14 jours.`,
        },
      },
      success_url: `${base}/dashboard/abonnement?paiement=ok`,
      cancel_url: `${base}/dashboard/abonnement`,
      integration_identifier: "syxtee-abonnement-qvmtrkzh",
    });
    url = session.url;
  } catch (e) {
    console.error("startCheckout", e instanceof Error ? e.message : e);
    return { error: "Stripe ne répond pas. Réessaie dans un instant." };
  }
  if (!url) return { error: "Stripe ne répond pas. Réessaie dans un instant." };
  redirect(url);
}

export async function openPortal(): Promise<BillingState> {
  await requireUser("/dashboard/abonnement");
  if (!hasStripe) return { error: "La gestion de l'abonnement n'est pas encore ouverte." };
  const profile = await getProfile();
  if (!profile?.stripe_customer_id) return { error: "Aucun abonnement sur ce compte." };
  let url: string;
  try {
    const session = await stripe().billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: `${await origin()}/dashboard/abonnement`, locale: "fr" });
    url = session.url;
  } catch (e) {
    console.error("openPortal", e instanceof Error ? e.message : e);
    return { error: "Stripe ne répond pas. Réessaie dans un instant." };
  }
  redirect(url);
}
