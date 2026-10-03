import assert from "node:assert/strict";
import { test } from "node:test";
import { abrInit, abrStep, COOLDOWN_MS, DOWN_AFTER_MS, LADDER, rungIndex, UP_AFTER_MS, type AbrState } from "./ladder.ts";

test("rungIndex : meilleur cran sous le choix", () => {
  assert.equal(rungIndex({ resolution: "1080p", bitrateKbps: 6000 }), 0);
  assert.equal(rungIndex({ resolution: "720p", bitrateKbps: 2000 }), 3);
  assert.equal(rungIndex({ resolution: "1080p", bitrateKbps: 1000 }), 5);
  assert.equal(rungIndex({ resolution: "480p", bitrateKbps: 100 }), LADDER.length - 1);
});

const run = (s: AbrState, from: number, to: number, input: { live: boolean; kbps: number | null }) => {
  let state = s;
  for (let t = from; t <= to; t += 1000) {
    const r = abrStep(state, { now: t, ...input });
    state = r.state;
    if (r.action) return { state, action: r.action, at: t };
  }
  return { state, action: null, at: to };
};

test("descend après 12 s de débit trop bas, pas avant", () => {
  const s = abrInit(3, 0);
  const t0 = COOLDOWN_MS;
  assert.equal(run(s, t0, t0 + DOWN_AFTER_MS - 1000, { live: true, kbps: 1000 }).action, null);
  const r = run(s, t0, t0 + DOWN_AFTER_MS + 1000, { live: true, kbps: 1000 });
  assert.equal(r.action, "down");
  assert.equal(r.state.index, 4);
});

test("pas de changement pendant le délai de grâce", () => {
  assert.equal(run(abrInit(3, 0), 0, COOLDOWN_MS - 1000, { live: false, kbps: null }).action, null);
});

test("relais hors ligne = affamé", () => {
  assert.equal(run(abrInit(3, 0), COOLDOWN_MS, COOLDOWN_MS + 20_000, { live: false, kbps: null }).action, "down");
});

test("un creux court remet le compteur à zéro", () => {
  let s = abrInit(3, 0);
  const t0 = COOLDOWN_MS;
  s = run(s, t0, t0 + 8000, { live: true, kbps: 500 }).state;
  s = run(s, t0 + 9000, t0 + 9000, { live: true, kbps: 2000 }).state;
  assert.equal(run(s, t0 + 10_000, t0 + 18_000, { live: true, kbps: 500 }).action, null);
});

test("remonte après 4 min stables, sans dépasser le choix", () => {
  const s: AbrState = { index: 5, ceiling: 3, changedAt: 0, lowSince: null, goodSince: null };
  const r = run(s, COOLDOWN_MS, COOLDOWN_MS + UP_AFTER_MS + 1000, { live: true, kbps: 800 });
  assert.equal(r.action, "up");
  assert.equal(r.state.index, 4);
  const top = abrInit(3, 0);
  assert.equal(run(top, COOLDOWN_MS, COOLDOWN_MS + UP_AFTER_MS + 5000, { live: true, kbps: 2000 }).action, null);
});

test("dernier cran : ne descend plus", () => {
  const s: AbrState = { index: LADDER.length - 1, ceiling: 3, changedAt: 0, lowSince: null, goodSince: null };
  assert.equal(run(s, COOLDOWN_MS, COOLDOWN_MS + 60_000, { live: false, kbps: null }).action, null);
});
