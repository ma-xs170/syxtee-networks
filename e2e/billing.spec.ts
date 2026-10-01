import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import Stripe from "stripe";
import { admin, createUser, deleteUser, hasTestProject, signInWithPassword, testEmail, testPassword } from "./helpers";

// Abonnements Stripe : faux événements signés envoyés au webhook (aucun appel à Stripe), sur le projet Supabase de test.
// STRIPE_WEBHOOK_SECRET de test : playwright.config.ts.
test.skip(!hasTestProject, "E2E_SUPABASE_URL / E2E_SUPABASE_SECRET_KEY manquants (.env.test.local)");

const SECRET = "whsec_syxtee_e2e_0123456789abcdef";
const DAY = 86_400;
const created: string[] = [];
test.afterAll(async () => {
  for (const id of created) await deleteUser(id);
});

function event(type: string, object: Record<string, unknown>, id = `evt_${randomUUID()}`) {
  return JSON.stringify({ id, object: "event", type, api_version: "2026-08-26.dahlia", created: Math.floor(Date.now() / 1000), data: { object } });
}

async function send(request: APIRequestContext, payload: string, signature?: string) {
  const header = signature ?? Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return request.post("/api/stripe/webhook", { data: payload, headers: { "content-type": "application/json", "stripe-signature": header } });
}

// Prix factices de playwright.config.ts : premium = formule « paid ».
const price = (tier: "basic" | "premium" | "extra", interval: "month" | "year") => `price_e2e_${tier}_${interval === "year" ? "yearly" : "monthly"}`;

function subscription(customer: string, o: { status: string; interval?: "month" | "year"; tier?: "basic" | "premium" | "extra"; end: number; cancel?: boolean }) {
  return {
    id: `sub_${customer}`,
    object: "subscription",
    customer,
    status: o.status,
    cancel_at_period_end: !!o.cancel,
    cancel_at: null,
    items: { object: "list", data: [{ id: "si_1", object: "subscription_item", current_period_end: o.end, price: { id: price(o.tier ?? "premium", o.interval ?? "month"), object: "price", recurring: { interval: o.interval ?? "month" } } }] },
  };
}

async function account(plan = "free") {
  const user = await createUser(testEmail("abo"), { password: testPassword() });
  created.push(user.id);
  const customer = `cus_e2e_${user.id.slice(0, 8)}`;
  await admin().from("profiles").update({ plan, stripe_customer_id: customer, onboarded_at: new Date().toISOString() }).eq("id", user.id);
  return { id: user.id, customer };
}

const profile = async (id: string) =>
  (await admin().from("profiles").select("plan, plan_until, billing_status, billing_interval, cancel_at_period_end").eq("id", id).single()).data!;

test("webhook : signature invalide refusée, rien ne change", async ({ request }) => {
  const { id, customer } = await account();
  const payload = event("customer.subscription.created", subscription(customer, { status: "active", end: Math.floor(Date.now() / 1000) + 30 * DAY }));
  expect((await send(request, payload, "t=1,v1=faux")).status()).toBe(400);
  expect((await request.post("/api/stripe/webhook", { data: payload })).status()).toBe(400);
  expect((await profile(id)).plan).toBe("free");
});

test("webhook : abonnement, doublon, résiliation, paiement, fin", async ({ request }) => {
  const { id, customer } = await account();
  const end = Math.floor(Date.now() / 1000) + 30 * DAY;

  const first = event("customer.subscription.created", subscription(customer, { status: "active", interval: "year", end }));
  expect((await send(request, first)).status()).toBe(200);
  let p = await profile(id);
  expect(p.plan).toBe("paid");
  expect(p.billing_status).toBe("active");
  expect(p.billing_interval).toBe("year");
  expect(Date.parse(p.plan_until!)).toBe((end + 2 * DAY) * 1000);

  // Même événement renvoyé : ignoré.
  const again = await send(request, first);
  expect(await again.json()).toMatchObject({ duplicate: true });

  // Résiliation demandée : reste Payant jusqu'à l'échéance.
  expect((await send(request, event("customer.subscription.updated", subscription(customer, { status: "active", interval: "year", end, cancel: true })))).status()).toBe(200);
  p = await profile(id);
  expect(p.plan).toBe("paid");
  expect(p.cancel_at_period_end).toBe(true);

  // Changement de formule (portail Stripe) : Premium → Extra, puis retour.
  expect((await send(request, event("customer.subscription.updated", subscription(customer, { status: "active", interval: "year", tier: "extra", end, cancel: true })))).status()).toBe(200);
  expect((await profile(id)).plan).toBe("extra");
  await send(request, event("customer.subscription.updated", subscription(customer, { status: "active", interval: "year", end, cancel: true })));
  expect((await profile(id)).plan).toBe("paid");

  // Prix inconnu de ce site : formule inchangée.
  const unknown = subscription(customer, { status: "active", interval: "year", end, cancel: true });
  unknown.items.data[0].price.id = "price_inconnu";
  await send(request, event("customer.subscription.updated", unknown));
  expect((await profile(id)).plan).toBe("paid");

  // Facture payée : enregistrée une seule fois pour les revenus.
  const invoice = { id: `in_${id.slice(0, 8)}`, object: "invoice", customer, amount_paid: 9900, amount_due: 9900, currency: "eur", created: end - 30 * DAY, status_transitions: { paid_at: end - 30 * DAY } };
  await send(request, event("invoice.paid", invoice));
  await send(request, event("invoice.paid", invoice));
  const { data: pays } = await admin().from("billing_payments").select("amount_cents, interval").eq("user_id", id);
  expect(pays).toEqual([{ amount_cents: 9900, interval: "year" }]);

  // Abonnement terminé : Gratuit.
  expect((await send(request, event("customer.subscription.deleted", subscription(customer, { status: "canceled", interval: "year", end })))).status()).toBe(200);
  p = await profile(id);
  expect(p.plan).toBe("free");
  expect(p.billing_status).toBe("canceled");

  const { data: log } = await admin().from("admin_audit").select("action, admin_email").eq("target_user", id);
  expect(log?.map((l) => l.action)).toEqual(expect.arrayContaining(["billing.subscribed", "billing.changed", "billing.ended"]));
  expect(new Set(log?.map((l) => l.admin_email))).toEqual(new Set(["stripe"]));
});

test("webhook : une formule Partenaire n'est jamais touchée", async ({ request }) => {
  const { id, customer } = await account("partner");
  await send(request, event("customer.subscription.created", subscription(customer, { status: "active", end: Math.floor(Date.now() / 1000) + 30 * DAY })));
  const p = await profile(id);
  expect(p.plan).toBe("partner");
  expect(p.billing_status).toBe("active");
});

test("page Abonnement : offres en Gratuit, gestion une fois abonné", async ({ page, request }) => {
  const email = testEmail("abo-ui");
  const password = testPassword();
  const user = await createUser(email, { password, plan: "free" });
  created.push(user.id);
  const customer = `cus_e2e_${user.id.slice(0, 8)}`;
  await admin().from("profiles").update({ stripe_customer_id: customer, onboarded_at: new Date().toISOString() }).eq("id", user.id);

  await signInWithPassword(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/abonnement");
  for (const name of ["Basique", "Premium", "Extra"]) await expect(page.getByRole("button", { name: `Choisir ${name}` })).toBeVisible();
  await expect(page.getByText("14,99 €")).toBeVisible();
  await page.getByRole("radio", { name: /Annuel/ }).click();
  await expect(page.getByText("149 €", { exact: true })).toBeVisible();

  await send(request, event("customer.subscription.created", subscription(customer, { status: "active", end: Math.floor(Date.now() / 1000) + 30 * DAY })));
  await page.goto("/dashboard/abonnement?paiement=ok");
  await expect(page.getByRole("button", { name: "Gérer mon abonnement" })).toBeVisible();
  await expect(page.getByText(/Prochain prélèvement le/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Choisir / })).toHaveCount(0);
  await expect(page.getByText(/Premium · Mensuel · 14,99 €/)).toBeVisible();
});
