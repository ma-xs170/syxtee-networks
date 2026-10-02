import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { test } from "node:test";
import { createBackups } from "../src/backups.ts";
import { loadConfig } from "../src/config.ts";
import { createRemote } from "../src/remote.ts";
import { buildServer, type Deps } from "../src/server.ts";
import { fakeDb } from "./fake-db.ts";

const U = "00000000-0000-4000-8000-000000000001";
const V = "00000000-0000-4000-8000-000000000002";

function make(quota = 1000) {
  const data = mkdtempSync(join(tmpdir(), "core-data-"));
  const config = loadConfig({ CORE_API_TOKEN: "t".repeat(40), SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_x", SLS_API_KEY: "slskey123", RELAY_KEYS_SECRET: "k".repeat(64), RELAY_PUBLIC_HOST: "relais.test", DATA_DIR: data });
  const db = fakeDb({ link_devices: ["token_hash"] }, { link_devices: () => ({ id: crypto.randomUUID(), created_at: "", last_seen: null }), link_backups: () => ({ id: crypto.randomUUID(), created_at: new Date().toISOString() }) });
  const verifyUser = async (h: string | undefined) => (h === "Bearer user-u" ? U : h === "Bearer user-v" ? V : null);
  const remote = createRemote({ db: db as never, canUse: (id) => id === U, verifyUser, log: () => {} });
  const backups = createBackups({ db: db as never, dir: join(data, "link-backups"), quota });
  const app = buildServer({
    config, relays: {}, health: { state: () => null, relay: () => null, liveRelays: () => [], byUser: () => [], events: { on() {}, off() {} } }, rtmp: {}, samples: { history: () => [] }, sessions: { current: () => null },
    verifyUser, previewPath: () => "", onKeysChanged: () => {}, slsHealthy: async () => true, remote, backups,
  } as unknown as Deps);
  return { app, data };
}
const user = { authorization: "Bearer user-u", "content-type": "application/json" };

async function connectDevice(app: ReturnType<typeof make>["app"]) {
  const s = (await app.inject({ method: "POST", url: "/v1/link/device/start", payload: { name: "Mac", platform: "darwin" } })).json();
  const ok = await app.inject({ method: "POST", url: "/v1/me/link/approve", headers: user, payload: { code: s.user_code } });
  assert.equal(ok.statusCode, 200);
  const p = (await app.inject({ method: "POST", url: "/v1/link/device/poll", payload: { device_code: s.device_code } })).json();
  assert.equal(p.status, "approved");
  return { authorization: `Bearer ${p.token}` };
}

test("téléchargements : seuls les installeurs connus, depuis DATA_DIR/downloads", async () => {
  const { app, data } = make();
  mkdirSync(join(data, "downloads"), { recursive: true });
  writeFileSync(join(data, "downloads", "SYXTEE-Link-mac.pkg"), "PKGDATA");
  writeFileSync(join(data, "downloads", "secret.txt"), "non");
  const ok = await app.inject({ method: "GET", url: "/dl/SYXTEE-Link-mac.pkg" });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body, "PKGDATA");
  assert.match(String(ok.headers["content-disposition"]), /attachment/);
  assert.equal((await app.inject({ method: "GET", url: "/dl/SYXTEE-Link-windows.exe" })).statusCode, 404); // absent
  for (const f of ["secret.txt", "..%2Fsecret.txt", "SYXTEE-Link-mac.pkg.txt", "evil.pkg"]) assert.equal((await app.inject({ method: "GET", url: `/dl/${f}` })).statusCode, 404, f);
});

test("connexion par appareil : seule un compte invité et connecté approuve", async () => {
  const { app } = make();
  const s = (await app.inject({ method: "POST", url: "/v1/link/device/start", payload: { name: "PC" } })).json();
  assert.match(s.user_code, /^[A-Z2-9]{8}$/);
  assert.equal((await app.inject({ method: "POST", url: "/v1/me/link/approve", payload: { code: s.user_code } })).statusCode, 401); // non connecté
  assert.equal((await app.inject({ method: "POST", url: "/v1/me/link/approve", headers: { ...user, authorization: "Bearer user-v" }, payload: { code: s.user_code } })).statusCode, 403); // non invité
  assert.equal((await app.inject({ method: "GET", url: `/v1/me/link/approve?code=${s.user_code}`, headers: user })).json().name, "PC");
  assert.equal((await app.inject({ method: "POST", url: "/v1/link/device/poll", payload: { device_code: s.device_code } })).json().status, "pending");
  assert.equal((await app.inject({ method: "POST", url: "/v1/me/link/approve", headers: user, payload: { code: "ZZZZZZZZ" } })).statusCode, 404);
});

test("sauvegardes : envoi avec le jeton d'appareil, liste, téléchargement, suppression, isolation", async () => {
  const { app } = make();
  const dev = await connectDevice(app);
  const body = Buffer.alloc(400, 9);
  const up = await app.inject({
    method: "POST", url: "/v1/link/backups?name=SYXTEE&collection=SYXTEE&media=3&obs=32.2.2&host=Mac",
    headers: { ...dev, "content-type": "application/gzip", "content-length": String(body.length) }, payload: Readable.from([body]),
  });
  assert.equal(up.statusCode, 200, up.body);
  const id = up.json().id;

  // Sans jeton d'appareil, ou avec un jeton de session : refusé pour l'API de l'agent.
  assert.equal((await app.inject({ method: "POST", url: "/v1/link/backups?name=x", headers: { "content-type": "application/gzip", "content-length": "1" }, payload: Readable.from([Buffer.from("x")]) })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: `/v1/link/backups/${id}`, headers: user })).statusCode, 401);

  const list = (await app.inject({ method: "GET", url: "/v1/me/link/backups", headers: user })).json();
  assert.equal(list.backups.length, 1);
  assert.equal(list.backups[0].media_count, 3);
  assert.equal(list.backups[0].user_id, undefined);
  assert.equal(list.used, 400);
  assert.equal(list.quota, 1000);

  const dl = await app.inject({ method: "GET", url: `/v1/link/backups/${id}`, headers: dev });
  assert.equal(dl.statusCode, 200);
  assert.equal(dl.rawPayload.length, 400);
  assert.equal((await app.inject({ method: "GET", url: "/v1/link/backups", headers: dev })).json().backups.length, 1);

  // Un autre compte ne peut ni lister ni supprimer.
  assert.equal((await app.inject({ method: "DELETE", url: `/v1/me/link/backups/${id}`, headers: { ...user, authorization: "Bearer user-v" } })).statusCode, 404);
  assert.equal((await app.inject({ method: "DELETE", url: `/v1/me/link/backups/${id}`, headers: user })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: `/v1/link/backups/${id}`, headers: dev })).statusCode, 404);
});

test("sauvegardes : quota (413), taille manquante (411), taille mensongère (400)", async () => {
  const { app } = make(1000);
  const dev = await connectDevice(app);
  const send = (n: number, declared: number | null) =>
    app.inject({ method: "POST", url: "/v1/link/backups?name=x", headers: { ...dev, "content-type": "application/gzip", ...(declared === null ? {} : { "content-length": String(declared) }) }, payload: Readable.from([Buffer.alloc(n, 1)]) });
  assert.equal((await send(600, 600)).statusCode, 200);
  assert.equal((await send(500, 500)).statusCode, 413); // 600 + 500 > 1000
  assert.equal((await send(100, 100)).statusCode, 200);
  assert.equal((await send(100, 50)).statusCode, 400); // plus long que annoncé
});
