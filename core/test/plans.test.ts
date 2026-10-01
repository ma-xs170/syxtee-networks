import assert from "node:assert/strict";
import { test } from "node:test";
import { PLAN_LIMITS, allowedRelayIds, publisherVerdict, roomFor } from "../src/plans.ts";

// Formules vendues : Basique (1 relais, 1 flux), Premium = paid (5 SRTLA + 5 RTMP, 3 flux), Extra (illimité, 10 flux).

const relay = (id: string, protocol: string, i: number) => ({ id, protocol, archived: false, created_at: `2026-09-${String(10 + i).padStart(2, "0")}T00:00:00Z` });

test("Basique : un seul relais autorisé (le plus ancien), un seul flux", () => {
  const rs = [relay("a", "rtmp", 1), relay("b", "srtla", 2)];
  assert.deepEqual([...allowedRelayIds({ plan: "basic", suspended: false }, rs)], ["a"]);
  assert.equal(publisherVerdict({ plan: "basic", suspended: false }, rs, "b", 0), "quota");
  assert.equal(publisherVerdict({ plan: "basic", suspended: false }, rs, "a", 1), "streams");
});

test("Premium : 5 relais par protocole, 10 au total", () => {
  const rs = [...Array.from({ length: 6 }, (_, i) => relay(`s${i}`, "srtla", i)), ...Array.from({ length: 5 }, (_, i) => relay(`r${i}`, "rtmp", 10 + i))];
  const ok = allowedRelayIds({ plan: "paid", suspended: false }, rs);
  assert.equal(ok.size, 10);
  assert.equal(ok.has("s5"), false, "6e relais SRTLA refusé");
  assert.equal(publisherVerdict({ plan: "paid", suspended: false }, rs, "r4", 2), null);
  assert.equal(publisherVerdict({ plan: "paid", suspended: false }, rs, "r4", 3), "streams");
});

test("Extra : relais illimités, 10 flux simultanés", () => {
  const rs = Array.from({ length: 25 }, (_, i) => relay(`x${i}`, i % 2 ? "rtmp" : "srtla", i));
  assert.equal(allowedRelayIds({ plan: "extra", suspended: false }, rs).size, 25);
  assert.equal(publisherVerdict({ plan: "extra", suspended: false }, rs, "x24", 9), null);
  assert.equal(publisherVerdict({ plan: "extra", suspended: false }, rs, "x24", 10), "streams");
});

test("roomFor : total et protocole", () => {
  assert.equal(roomFor(PLAN_LIMITS.paid, { total: 9, sameProtocol: 4 }), true);
  assert.equal(roomFor(PLAN_LIMITS.paid, { total: 9, sameProtocol: 5 }), false);
  assert.equal(roomFor(PLAN_LIMITS.paid, { total: 10, sameProtocol: 0 }), false);
  assert.equal(roomFor(PLAN_LIMITS.basic, { total: 1, sameProtocol: 0 }), false);
  assert.equal(roomFor(PLAN_LIMITS.extra, { total: 500, sameProtocol: 500 }), true);
});
