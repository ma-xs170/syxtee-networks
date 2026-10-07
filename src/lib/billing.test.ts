import assert from "node:assert/strict";
import { test } from "node:test";
import { GRACE_MS, canSubscribe, decide, mrrCents, renews } from "./billing.ts";

const end = 1_800_000_000; // fin de période (s)

test("MRR : par formule, annuels ramenés au mois", () => {
  assert.equal(mrrCents({}), 0);
  assert.equal(mrrCents({ basic: { month: 2 } }), 998);
  assert.equal(mrrCents({ paid: { year: 12 } }), 9900);
  assert.equal(mrrCents({ basic: { month: 1 }, paid: { month: 1, year: 1 }, extra: { month: 1 } }), Math.round(499 + 999 + 9900 / 12 + 1999));
});

test("abonnement actif ou en relance : formule du prix, jusqu'à la fin de période + marge", () => {
  for (const status of ["active", "past_due", "trialing"])
    for (const tier of ["basic", "paid", "extra"] as const) {
      assert.deepEqual(decide({ status, periodEnd: end, tier }, "free"), { kind: "sub", plan: tier, until: new Date(end * 1000 + GRACE_MS) });
      assert.deepEqual(decide({ status, periodEnd: end, tier }, "basic"), { kind: "sub", plan: tier, until: new Date(end * 1000 + GRACE_MS) });
    }
});

test("abonnement terminé : Gratuit seulement depuis une formule vendue", () => {
  for (const status of ["canceled", "unpaid", "incomplete_expired"]) {
    for (const plan of ["basic", "paid", "extra"]) assert.deepEqual(decide({ status, periodEnd: end, tier: "paid" }, plan), { kind: "free" });
    assert.deepEqual(decide({ status, periodEnd: end, tier: "paid" }, "free"), { kind: "none" });
  }
});

test("formules manuelles jamais touchées", () => {
  for (const plan of ["partner", "beta", "admin"]) {
    assert.deepEqual(decide({ status: "active", periodEnd: end, tier: "extra" }, plan), { kind: "none" });
    assert.deepEqual(decide({ status: "canceled", periodEnd: end, tier: "extra" }, plan), { kind: "none" });
  }
});

test("paiement initial incomplet ou prix inconnu : rien", () => {
  assert.deepEqual(decide({ status: "incomplete", periodEnd: end, tier: "paid" }, "free"), { kind: "none" });
  assert.deepEqual(decide({ status: "active", periodEnd: null, tier: "paid" }, "free"), { kind: "none" });
  assert.deepEqual(decide({ status: "active", periodEnd: end, tier: null }, "free"), { kind: "none" });
});

test("renouvellement automatique et droit de s'abonner", () => {
  assert.equal(renews({ billing_status: "active", cancel_at_period_end: false }), true);
  assert.equal(renews({ billing_status: "active", cancel_at_period_end: true }), false);
  assert.equal(renews({ billing_status: null }), false);
  assert.equal(canSubscribe({ plan: "free", billing_status: null }), true);
  assert.equal(canSubscribe({ plan: "free", billing_status: "canceled" }), true);
  assert.equal(canSubscribe({ plan: "basic", billing_status: "active" }), false);
  assert.equal(canSubscribe({ plan: "partner", billing_status: null }), false);
});
