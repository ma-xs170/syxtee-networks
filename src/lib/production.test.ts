import assert from "node:assert/strict";
import { test } from "node:test";
import { PLANS } from "./plans.ts";
import { PRODUCTION } from "./billing.ts";
import { kindFullMessage, kindLimit } from "./production.ts";

test("Production : une place de streamer par relais, vidéastes à part, encadrement libre", () => {
  assert.equal(kindLimit(PLANS.prod_s, "streamer"), 5);
  assert.equal(kindLimit(PLANS.prod_s, "videaste"), 2);
  assert.equal(kindLimit(PLANS.prod_s, "staff"), null);
  assert.equal(kindLimit(PLANS.prod_l, "streamer"), 40);
});

test("formules sans Production : aucune limite par type", () => {
  for (const id of ["free", "paid", "extra", "partner"] as const) assert.equal(kindLimit(PLANS[id], "videaste"), null, id);
});

test("refus seulement quand les places sont prises", () => {
  assert.equal(kindFullMessage(PLANS.prod_s, "videaste", 1), null);
  assert.match(kindFullMessage(PLANS.prod_s, "videaste", 2) ?? "", /2 vidéastes au plus/);
});

test("les limites du catalogue affiché suivent les plans (une seule vérité)", () => {
  for (const [id, c] of Object.entries(PRODUCTION)) {
    assert.equal(c.streamers, PLANS[id as keyof typeof PRODUCTION].maxRelays, `${id} streamers`);
    assert.equal(c.videographers, PLANS[id as keyof typeof PRODUCTION].maxVideographers, `${id} vidéastes`);
  }
});
