import assert from "node:assert/strict";
import { test } from "node:test";
import { GRACE_MS, canSubscribe, decide, mrrCents, renews } from "./billing.ts";

test("MRR : mensuels + annuels / 12", () => {
  assert.equal(mrrCents(0, 0), 0);
  assert.equal(mrrCents(2, 0), 1998);
  assert.equal(mrrCents(0, 12), 9900);
  assert.equal(mrrCents(3, 1), 2997 + 825);
});

const end = 1_800_000_000; // fin de période (s)

test("abonnement actif ou en relance : Payant jusqu'à la fin de période + marge", () => {
  for (const status of ["active", "past_due", "trialing"]) {
    assert.deepEqual(decide({ status, periodEnd: end }, "free"), { kind: "paid", until: new Date(end * 1000 + GRACE_MS) });
    assert.deepEqual(decide({ status, periodEnd: end }, "paid"), { kind: "paid", until: new Date(end * 1000 + GRACE_MS) });
  }
});

test("abonnement terminé : Gratuit seulement depuis Payant", () => {
  for (const status of ["canceled", "unpaid", "incomplete_expired"]) {
    assert.deepEqual(decide({ status, periodEnd: end }, "paid"), { kind: "free" });
    assert.deepEqual(decide({ status, periodEnd: end }, "free"), { kind: "none" });
  }
});

test("formules manuelles jamais touchées", () => {
  for (const plan of ["partner", "beta", "admin"]) {
    assert.deepEqual(decide({ status: "active", periodEnd: end }, plan), { kind: "none" });
    assert.deepEqual(decide({ status: "canceled", periodEnd: end }, plan), { kind: "none" });
  }
});

test("paiement initial incomplet : rien", () => {
  assert.deepEqual(decide({ status: "incomplete", periodEnd: end }, "free"), { kind: "none" });
  assert.deepEqual(decide({ status: "active", periodEnd: null }, "free"), { kind: "none" });
});

test("renouvellement automatique et droit de s'abonner", () => {
  assert.equal(renews({ billing_status: "active", cancel_at_period_end: false }), true);
  assert.equal(renews({ billing_status: "active", cancel_at_period_end: true }), false);
  assert.equal(renews({ billing_status: null }), false);
  assert.equal(canSubscribe({ plan: "free", billing_status: null }), true);
  assert.equal(canSubscribe({ plan: "free", billing_status: "canceled" }), true);
  assert.equal(canSubscribe({ plan: "paid", billing_status: "active" }), false);
  assert.equal(canSubscribe({ plan: "partner", billing_status: null }), false);
});
