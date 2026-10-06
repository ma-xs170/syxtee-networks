import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { createSealer } from "../src/keys.ts";
import { createRelayStore } from "../src/relays.ts";
import type { Sls } from "../src/sls.ts";
import { fakeDb, fakeSls } from "./fake-db.ts";

// Changement de serveur d'un relais : même id, mêmes clés, seul le serveur change.

const U = "00000000-0000-4000-8000-000000000001";
const sealer = createSealer(randomBytes(32));
const UNIQUE = { relays: ["publish_hash", "play_hash", "out_publish_hash", "out_play_hash", "cam_hash"] };

function setup() {
  let n = 0;
  const db = fakeDb(UNIQUE, {
    relays: () => ({ archived: false, mode: "direct", status: "offline", rotated_at: null, last_live_at: null, created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, n++)).toISOString() }),
  });
  db.rows("profiles").push({ id: U, plan: "beta", suspended_at: null, username: "u" });
  const { sls, pairs } = fakeSls();
  const revoked: string[][] = [];
  const store = createRelayStore(db as never, sls as unknown as Sls, "bhs1", { sealer, onRevoked: (k) => revoked.push(k) });
  return { store, pairs, revoked };
}

test("quitter le serveur : même id et mêmes clés, paires retirées du SLS, sessions coupées", async () => {
  const { store, pairs, revoked } = setup();
  const r = await store.create(U, { name: "Cam", protocol: "srtla", limit: 3 });
  const before = pairs.size;
  const moved = await store.move(r, "par1");
  assert.equal(moved.id, r.id);
  assert.equal(moved.server, "par1");
  assert.equal(moved.publish_id, r.publish_id);
  assert.equal(moved.play_id, r.play_id);
  assert.ok(pairs.size < before);
  assert.equal(revoked.length, 1);
  assert.equal((await store.allowed()).length, 0);
});

test("arriver sur ce serveur : la paire est déclarée avec les mêmes clés", async () => {
  const { store, pairs } = setup();
  const r = await store.create(U, { name: "Cam", protocol: "srtla", limit: 3 });
  const away = await store.move(r, "par1");
  const back = await store.move(away, "bhs1");
  assert.equal(back.server, "bhs1");
  assert.equal(back.publish_id, r.publish_id);
  assert.ok(pairs.size > 0);
  assert.equal((await store.allowed()).length, 1);
});

test("même serveur : rien ne change", async () => {
  const { store } = setup();
  const r = await store.create(U, { name: "Cam", protocol: "srtla", limit: 3 });
  assert.equal(await store.move(r, "bhs1"), r);
});
