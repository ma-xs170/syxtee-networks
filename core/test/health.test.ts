import assert from "node:assert/strict";
import { test } from "node:test";
import { congestion, createHealthMonitor } from "../src/health.ts";
import type { KeyRow } from "../src/keys.ts";
import { openSamples } from "../src/samples.ts";
import type { PublisherStats, Sls } from "../src/sls.ts";

const key = (n: number): KeyRow => ({
  user_id: `00000000-0000-0000-0000-00000000000${n}`,
  publish_id: `live_${n}`, play_id: `play_${n}`, out_publish_id: `live_out_${n}`, out_play_id: `play_out_${n}`,
  mode: "direct", created_at: "", rotated_at: null,
});

function fakeSls(stats: Record<string, PublisherStats | null>) {
  const calls: string[] = [];
  const sls = { stats: async (p: string) => (calls.push(p), stats[p] ?? null) } as unknown as Sls;
  return { sls, calls };
}

test("congestion : 0 si fluide, monte avec le RTT et les pertes", () => {
  assert.equal(congestion(40, 0), 0);
  assert.ok(congestion(400, 0) > 0.5);
  assert.equal(congestion(40, 100), 1);
});

test("un flux passe en live, enregistre ses points et calcule les pertes par intervalle", async () => {
  let t = 1_000_000;
  const stats: Record<string, PublisherStats | null> = { play_1: { bitrate: 6000, rtt: 40, dropped_pkts: 10 } };
  const { sls } = fakeSls(stats);
  const samples = openSamples(":memory:");
  const h = createHealthMonitor({ sls, samples, perSecond: 5, now: () => t });
  h.setKeys([key(1)]);
  const statuses: boolean[] = [];
  h.events.on("status", (_id: string, s: { live: boolean }) => statuses.push(s.live));

  await h.tick();
  assert.equal(h.state(key(1).user_id)?.live, true);
  t += 2100;
  stats.play_1 = { bitrate: 5000, rtt: 60, dropped_pkts: 25 };
  await h.tick();
  assert.equal(h.state(key(1).user_id)?.sample?.dropped, 15);
  t += 2100;
  stats.play_1 = null;
  await h.tick();
  assert.deepEqual(statuses, [true, false]);
  assert.equal(samples.history(key(1).user_id, 0).length, 2);
});

test("respecte le budget de requêtes du SLS", async () => {
  let t = 5_000_000;
  const keys = Array.from({ length: 9 }, (_, i) => key(i + 1));
  const { sls, calls } = fakeSls(Object.fromEntries(keys.map((k) => [k.play_id, { bitrate: 3000, rtt: 30 }])));
  const h = createHealthMonitor({ sls, samples: openSamples(":memory:"), perSecond: 4.5, now: () => t });
  h.setKeys(keys);
  for (let i = 0; i < 50; i++) {
    t += 200;
    await h.tick();
  }
  // 10 s simulées, 4,5 requêtes/s au plus (+ crédit initial)
  assert.ok(calls.length <= 4.5 * 10 + 5, `${calls.length} requêtes`);
  // et chaque flux a bien été relevé
  assert.equal(new Set(calls).size, 9);
});
