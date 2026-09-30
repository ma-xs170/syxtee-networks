import Stripe from "stripe";
import { NextResponse } from "next/server";
import { handleStripeEvent } from "@/lib/billing-sync";

// Webhook Stripe (abonnements). Signature vérifiée sur le corps brut avec STRIPE_WEBHOOK_SECRET :
// sans signature valide, 400 et rien n'est modifié. Erreur de traitement : 500, Stripe renverra l'événement.

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "signature manquante" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "signature invalide" }, { status: 400 });
  }

  try {
    const fresh = await handleStripeEvent(event);
    return NextResponse.json({ received: true, duplicate: !fresh });
  } catch (e) {
    console.error("stripe webhook", event.type, event.id, e);
    return NextResponse.json({ error: "traitement impossible" }, { status: 500 });
  }
}
