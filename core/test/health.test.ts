import assert from "node:assert/strict";
import { test } from "node:test";
import { congestion, createHealthMonitor } from "../src/health.ts";
import type { Relay } from "../src/relays.ts";
import { openSamples } from "../src/samples.ts";
import type { PublisherStats, Sls } from "../src/sls.ts";

const key = (n: number): Relay => ({
  id: `10000000-0000-0000-0000-00000000000${n}`, user_id: "00000000-0000-0000-0000-000000000001", name: `Relais ${n}`, protocol: "srtla", server: "nyc1",
  publish_id: `live_${n}`, play_id: `play_${n}`, out_publish_id: `live_out_${n}`, out_play_id: `play_out_${n}`,
  cam_key: null, mode: "direct", status: "offline", archived: false, created_at: "", rotated_at: null, last_live_at: null,
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
  assert.equal(h.state(key(1).id)?.live, true);
  t += 2100;
  stats.play_1 = { bitrate: 5000, rtt: 60, dropped_pkts: 25 };
  await h.tick();
  assert.equal(h.state(key(1).id)?.sample?.dropped, 15);
  t += 2100;
  stats.play_1 = null;
  await h.tick();
  assert.deepEqual(statuses, [true, false]);
  assert.equal(samples.history(key(1).id, 0).length, 2);
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

test("plusieurs relais d'un même compte : états séparés, regroupés par compte", async () => {
  const t = 9_000_000;
  const { sls } = fakeSls({ play_1: { bitrate: 4000, rtt: 30 }, play_2: null });
  const h = createHealthMonitor({ sls, samples: openSamples(":memory:"), perSecond: 5, now: () => t });
  h.setKeys([key(1), key(2)]);
  await h.tick();
  assert.equal(h.state(key(1).id)?.live, true);
  assert.equal(h.state(key(2).id)?.live, false);
  assert.deepEqual(h.byUser(key(1).user_id).map((x) => [x.relay.id, x.state.live]), [[key(1).id, true], [key(2).id, false]]);
  assert.equal(h.relay(key(2).id)?.name, "Relais 2");
  assert.deepEqual(h.liveRelays().map((r) => r.id), [key(1).id]);
});
