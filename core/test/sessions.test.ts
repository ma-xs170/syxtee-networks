import assert from "node:assert/strict";
import { test } from "node:test";
import { GRACE_MS, createSessionTracker, downsample, type SessionDb, type SessionRow } from "../src/sessions.ts";

function fakeDb() {
  const rows = new Map<string, SessionRow>();
  let n = 0;
  const db: SessionDb = {
    async insert(row) {
      const id = `s${++n}`;
      rows.set(id, { ...row });
      return id;
    },
    async update(id, patch) {
      rows.set(id, { ...rows.get(id)!, ...patch });
    },
    async closeStale() {
      return 0;
    },
  };
  return { db, rows };
}

const U = "00000000-0000-0000-0000-000000000001";
const R = "10000000-0000-0000-0000-000000000001";

test("downsample : moyenne par tranche, jamais plus de n points", () => {
  assert.deepEqual(downsample([1, 2, 3]), [1, 2, 3]);
  const out = downsample(Array.from({ length: 600 }, (_, i) => (i < 300 ? 1000 : 3000)), 60);
  assert.equal(out.length, 60);
  assert.equal(out[0], 1000);
  assert.equal(out[59], 3000);
});

test("une session s'ouvre au passage en ligne et se ferme après la période de grâce", async () => {
  let t = 1_000_000;
  const { db, rows } = fakeDb();
  const s = createSessionTracker({ db, relay: "nyc1", now: () => t });

  s.status(R, true, U);
  s.sample(R, 6000);
  t += 2000;
  s.sample(R, 4000);
  t += 118_000;
  s.sample(R, 5000);
  s.status(R, false, U);
  await s.tick();
  assert.ok(s.current(R)?.reconnecting);

  t += GRACE_MS;
  await s.tick();
  assert.equal(s.current(R), null);
  const [row] = [...rows.values()];
  assert.equal(row.relay, "nyc1");
  assert.equal(row.relay_id, R);
  assert.equal(row.user_id, U);
  assert.equal(row.duration_s, 120);
  assert.equal(row.avg_kbps, 5000);
  assert.equal(row.peak_kbps, 6000);
  assert.equal(row.reconnects, 0);
  assert.equal(row.ended_at, new Date(1_000_000 + 120_000).toISOString());
  assert.deepEqual(row.bitrate_series, [6000, 4000, 5000]);
});

test("une coupure courte compte comme une reconnexion, pas comme un nouveau direct", async () => {
  let t = 0;
  const { db, rows } = fakeDb();
  const s = createSessionTracker({ db, relay: "nyc1", now: () => t });
  s.status(R, true, U);
  t += 10_000;
  s.status(R, false, U);
  t += 20_000;
  await s.tick();
  s.status(R, true, U);
  t += 10_000;
  s.status(R, false, U);
  t += GRACE_MS;
  await s.tick();
  assert.equal(rows.size, 1);
  assert.equal([...rows.values()][0].reconnects, 1);
});

test("sauvegarde toutes les 30 s pendant le direct", async () => {
  let t = 0;
  const { db, rows } = fakeDb();
  const s = createSessionTracker({ db, relay: "nyc1", now: () => t });
  s.status(R, true, U);
  t += 31_000;
  s.sample(R, 3000);
  await s.tick();
  const row = [...rows.values()][0];
  assert.equal(row.ended_at, null);
  assert.equal(row.duration_s, 31);
  assert.equal(row.avg_kbps, 3000);
});

test("deux relais du même compte en direct en même temps : deux sessions", async () => {
  let t = 0;
  const { db, rows } = fakeDb();
  const s = createSessionTracker({ db, relay: "nyc1", now: () => t });
  const R2 = "10000000-0000-0000-0000-000000000002";
  s.status(R, true, U);
  s.status(R2, true, U);
  t += 10_000;
  s.status(R, false, U);
  s.status(R2, false, U);
  t += GRACE_MS;
  await s.tick();
  assert.deepEqual([...rows.values()].map((r) => r.relay_id).sort(), [R, R2]);
});
