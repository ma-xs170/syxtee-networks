import assert from "node:assert/strict";
import { test } from "node:test";
import { efficiency, levelOf, seriesStats, share, sortPeers, summarize } from "./control-center.ts";

test("niveaux : coupé, très bas, faible, bon", () => {
  assert.deepEqual([0, 100, 600, 3000].map(levelOf), ["off", "bad", "warn", "ok"]);
});

test("rendement : débit utile sur débit réseau, nul sans mesure", () => {
  assert.equal(efficiency([{ connection_id: "a", bitrate: 900, throughput: 1000 }]), 90);
  assert.equal(efficiency([{ connection_id: "a", bitrate: 900 }]), null);
  assert.equal(efficiency([{ connection_id: "a", bitrate: 1200, throughput: 1000 }]), 100);
});

test("résumé : actives, faibles, plus forte et plus faible", () => {
  const s = summarize([{ connection_id: "a", bitrate: 3000 }, { connection_id: "b", bitrate: 200 }, { connection_id: "c", bitrate: 1500 }]);
  assert.deepEqual({ ...s }, { total: 4700, active: 2, weak: 1, strongest: "a", weakest: "b" });
  assert.equal(summarize([{ connection_id: "a", bitrate: 5 }]).weakest, null);
});

test("ordre stable et parts", () => {
  assert.deepEqual(sortPeers([{ connection_id: "b" }, { connection_id: "a" }]).map((p) => p.connection_id), ["a", "b"]);
  assert.equal(share(500, 2000), 25);
  assert.equal(share(5, 0), 0);
});

test("série : moyenne, bornes et part du temps coupé", () => {
  const s = seriesStats([100, 2000, 3000, 2000].map((v, t) => ({ t, v })));
  assert.deepEqual({ ...s, avg: Math.round(s.avg) }, { avg: 1775, min: 100, max: 3000, down: 25 });
  assert.equal(seriesStats([]).max, 0);
});
