import "server-only";
import type Stripe from "stripe";
import { paymentFailed } from "@/emails/templates";
import { decide, type Interval } from "@/lib/billing";
import { sendEmail } from "@/lib/email/send";
import { applyBillingEvent } from "@/lib/plan-admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Traitement des webhooks Stripe. Aucun appel à l'API Stripe : tout est lu dans l'événement (testable hors ligne).
// Le compte est retrouvé par stripe_customer_id, posé par le serveur avant le paiement (jamais par des métadonnées).

const idOf = (x: string | { id: string } | null | undefined) => (typeof x === "string" ? x : (x?.id ?? null));

async function userByCustomer(customer: string | null) {
  if (!customer) return null;
  const { data } = await createAdminClient().from("profiles").select("id, plan, billing_interval").eq("stripe_customer_id", customer).maybeSingle<{ id: string; plan: string; billing_interval: Interval | null }>();
  return data;
}

/** Abonnement créé, modifié ou supprimé : colonnes billing_* puis formule. */
async function syncSubscription(sub: Stripe.Subscription) {
  const user = await userByCustomer(idOf(sub.customer));
  if (!user) {
    console.warn("stripe : abonnement d'un client inconnu", sub.id);
    return;
  }
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end ?? null;
  const interval = item?.price.recurring?.interval;
  const { error } = await createAdminClient()
    .from("profiles")
    .update({
      stripe_subscription_id: sub.id,
      billing_status: sub.status,
      billing_interval: interval === "year" || interval === "month" ? interval : user.billing_interval,
      cancel_at_period_end: sub.cancel_at_period_end || sub.cancel_at != null,
      billing_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq("id", user.id);
  if (error) throw new Error(`profiles billing : ${error.message}`);
  await applyBillingEvent(user.id, decide({ status: sub.status, periodEnd }, user.plan));
}

/** Facture payée : une ligne pour la page Revenus (idempotent sur l'id de facture). */
async function recordPayment(inv: Stripe.Invoice) {
  if (!inv.id || inv.amount_paid <= 0) return;
  const user = await userByCustomer(idOf(inv.customer));
  const paidAt = inv.status_transitions?.paid_at ?? inv.created;
  const { error } = await createAdminClient()
    .from("billing_payments")
    .upsert(
      { invoice_id: inv.id, user_id: user?.id ?? null, amount_cents: inv.amount_paid, currency: inv.currency, interval: user?.billing_interval ?? null, paid_at: new Date(paidAt * 1000).toISOString() },
      { onConflict: "invoice_id" },
    );
  if (error) throw new Error(`billing_payments : ${error.message}`);
}

/** Prélèvement refusé : email avec lien vers le portail (Stripe réessaie de son côté). */
async function notifyFailure(inv: Stripe.Invoice) {
  const user = await userByCustomer(idOf(inv.customer));
  if (!user) return;
  const { data } = await createAdminClient().auth.admin.getUserById(user.id);
  if (data.user?.email) await sendEmail(data.user.email, paymentFailed({ amount: inv.amount_due, currency: inv.currency }));
}

/** Première fois : lie le client au compte si le lien n'existe pas encore (client_reference_id = id du compte, posé par le serveur). */
async function linkCheckout(s: Stripe.Checkout.Session) {
  const customer = idOf(s.customer);
  if (!customer || !s.client_reference_id) return;
  await createAdminClient().from("profiles").update({ stripe_customer_id: customer }).eq("id", s.client_reference_id).is("stripe_customer_id", null);
}

/** Traite un événement vérifié. false : déjà traité (doublon). */
export async function handleStripeEvent(event: Stripe.Event) {
  const db = createAdminClient();
  const { data: seen, error: readError } = await db.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (readError) throw new Error(`stripe_events : ${readError.message}`);
  if (seen) return false;

  switch (event.type) {
    case "checkout.session.completed":
      await linkCheckout(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
    case "invoice.paid":
      await recordPayment(event.data.object);
      break;
    case "invoice.payment_failed":
      await notifyFailure(event.data.object);
      break;
  }

  // Marqué traité seulement après succès : en cas d'erreur, Stripe renvoie l'événement et on recommence.
  const { error } = await db.from("stripe_events").insert({ id: event.id, type: event.type });
  if (error && error.code !== "23505") throw new Error(`stripe_events : ${error.message}`);
  return true;
}
