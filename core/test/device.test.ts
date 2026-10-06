import assert from "node:assert/strict";
import { test } from "node:test";
import { createRemote, hashToken, isDeviceToken } from "../src/remote.ts";
import { fakeDb } from "./fake-db.ts";

const U = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";

function make(now = () => Date.now()) {
  const db = fakeDb({ link_devices: ["token_hash", "refresh_hash"] }, { link_devices: () => ({ id: crypto.randomUUID(), created_at: "", last_seen: null }) });
  const remote = createRemote({ db: db as never, canUse: (id) => id === U, verifyUser: async () => null, log: () => {}, now });
  return { remote, db };
}

test("connexion depuis le plugin : démarrer, approuver sur le site, récupérer le jeton une seule fois", async () => {
  const { remote, db } = make();
  const s = remote.deviceStart("3.3.3.3", "Mac de Mathis", "darwin");
  assert.ok("device_code" in s);
  if (!("device_code" in s)) return;
  assert.match(s.user_code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.deepEqual(await remote.devicePoll(s.device_code), { status: "pending" });
  const looked = remote.deviceLookup(s.user_code);
  assert.equal(looked?.name, "Mac de Mathis");
  assert.equal(looked?.platform, "darwin");
  assert.ok(looked?.scopes.includes("obs.control"));
  // Compte sans invitation, ou mauvais code : refusé.
  assert.equal(remote.deviceApprove(OTHER, s.user_code), null);
  assert.equal(remote.deviceApprove(U, "ZZZZZZZZ"), null);
  assert.equal(remote.deviceApprove(U, s.user_code.toLowerCase())?.name, "Mac de Mathis");
  const p = await remote.devicePoll(s.device_code);
  assert.equal(p.status, "approved");
  assert.ok("token" in p && isDeviceToken(p.token));
  const row = db.rows("link_devices")[0];
  assert.equal(row.user_id, U);
  assert.equal(row.token_hash, hashToken("token" in p ? p.token : ""));
  // Le jeton n'est donné qu'une fois, et le code ne peut plus être approuvé.
  assert.deepEqual(await remote.devicePoll(s.device_code), { status: "expired" });
  assert.equal(remote.deviceApprove(U, s.user_code), null);
});

test("connexion depuis le plugin : expiration, limite de démarrages", async () => {
  let t = 1_000_000;
  const { remote } = make(() => t);
  const s = remote.deviceStart("4.4.4.4", "PC", "win32");
  assert.ok("device_code" in s);
  if (!("device_code" in s)) return;
  t += 11 * 60_000;
  assert.deepEqual(await remote.devicePoll(s.device_code), { status: "expired" });
  assert.equal(remote.deviceApprove(U, s.user_code), null);
  assert.equal(remote.deviceLookup(s.user_code), null);
  for (let i = 0; i < 10; i++) assert.ok("device_code" in remote.deviceStart("5.5.5.5", "x", "x"));
  assert.deepEqual(remote.deviceStart("5.5.5.5", "x", "x"), { error: "too_many" });
  assert.ok("device_code" in remote.deviceStart("5.5.5.6", "x", "x")); // une autre IP n'est pas touchée
});

test("deviceUser : le jeton d'appareil authentifie les envois de sauvegardes", async () => {
  const { remote } = make();
  const s = remote.deviceStart("6.6.6.6", "PC", "darwin");
  if (!("device_code" in s)) throw new Error("start");
  remote.deviceApprove(U, s.user_code);
  const ok = await remote.devicePoll(s.device_code);
  if (ok.status !== "approved") throw new Error("poll");
  assert.equal(await remote.deviceUser(`Bearer ${ok.token}`), U);
  assert.equal(await remote.deviceUser(`Bearer slk_${"0".repeat(48)}`), null);
  assert.equal(await remote.deviceUser("Bearer pas-un-jeton"), null);
  assert.equal(await remote.deviceUser(undefined), null);
});
