import assert from "node:assert/strict";
import { test } from "node:test";
import { openSamples } from "../src/samples.ts";

test("historique par connexion : un fil par modem, réduit sans perdre les connexions", () => {
  const s = openSamples(":memory:");
  for (let i = 0; i < 1000; i++) s.addPeers("r1", 1000 + i * 2000, [{ connection_id: "a", bitrate: 2000, throughput: 2200, jitter: 4 }, { connection_id: "b", bitrate: 500 }]);
  s.addPeers("autre", 5000, [{ connection_id: "z", bitrate: 1 }]);
  const h = s.peerHistory("r1", 0, 100);
  assert.deepEqual(Object.keys(h).sort(), ["a", "b"]);
  assert.ok(h.a.length <= 100 && h.a.length >= 50);
  assert.equal(Math.round(h.a[0].bitrate), 2000);
  assert.equal(h.b[0].throughput, null);
});

test("purge : les points de plus de 24 h partent aussi pour les connexions", () => {
  const s = openSamples(":memory:");
  s.addPeers("r1", 1000, [{ connection_id: "a", bitrate: 1 }]);
  s.purge(1000 + 25 * 3600_000);
  assert.deepEqual(s.peerHistory("r1", 0), {});
});
