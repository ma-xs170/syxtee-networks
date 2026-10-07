import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { test } from "node:test";
import { createBackups } from "../src/backups.ts";
import { loadConfig } from "../src/config.ts";
import { createObsPreview } from "../src/obspreview.ts";
import { createRemote } from "../src/remote.ts";
import { buildServer, type Deps } from "../src/server.ts";
import { fakeDb } from "./fake-db.ts";

const U = "00000000-0000-4000-8000-000000000001";
const V = "00000000-0000-4000-8000-000000000002";

const RELAYS = [
  { id: "00000000-0000-4000-8000-0000000000a1", user_id: U, name: "Moblin", protocol: "srtla", server: "bhs1", archived: false, mode: "direct", status: "offline", created_at: "", rotated_at: null, last_live_at: null, publish_id: "pub_secret", play_id: "play_secret", out_play_id: "out_secret" },
  { id: "00000000-0000-4000-8000-0000000000a2", user_id: U, name: "Ancien", protocol: "rtmp", server: "bhs1", archived: true, mode: "direct", status: "offline", created_at: "", rotated_at: null, last_live_at: null, publish_id: "p2", play_id: "q2", out_play_id: "o2" },
];

function make(quota = 1000) {
  const data = mkdtempSync(join(tmpdir(), "core-data-"));
  const config = loadConfig({ CORE_API_TOKEN: "t".repeat(40), SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_x", SLS_API_KEY: "slskey123", RELAY_KEYS_SECRET: "k".repeat(64), RELAY_PUBLIC_HOST: "relais.test", DATA_DIR: data });
  const db = fakeDb({ link_devices: ["token_hash", "refresh_hash"] }, { link_devices: () => ({ id: crypto.randomUUID(), created_at: "", last_seen: null }), link_backups: () => ({ id: crypto.randomUUID(), created_at: new Date().toISOString() }) });
  const verifyUser = async (h: string | undefined) => (h === "Bearer user-u" ? U : h === "Bearer user-v" ? V : null);
  const remote = createRemote({
    db: db as never, canUse: (id) => id === U, verifyUser, log: () => {},
    account: async (id) => (id === U ? { email: "mathis@example.com", name: "Mathis D", avatar_url: "https://img.example/a.png", plan: "pro" } : null),
  });
  const backups = createBackups({ db: db as never, dir: join(data, "link-backups"), quota });
  const app = buildServer({
    config, relays: {
      list: async (id: string) => (id === U ? RELAYS : []),
      get: async (rid: string) => RELAYS.find((r) => r.id === rid) ?? null,
      setSwitchTrigger: async (r: (typeof RELAYS)[number], t: string) => Object.assign(r, { switch_trigger: t }),
    }, health: { state: (id: string) => (id === RELAYS[0].id ? { live: true, sample: { bitrate: 4321.6 } } : null), relay: () => null, liveRelays: () => [], byUser: () => [], events: { on() {}, off() {} } }, rtmp: {}, samples: { history: () => [] }, sessions: { current: () => null },
    verifyUser, previewPath: () => "", onKeysChanged: () => {}, slsHealthy: async () => true, remote, backups,
    obsPreview: createObsPreview({ whipBase: "https://cam.test", apiUrl: "http://127.0.0.1:9", log: () => {} }),
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

test("jetons : renouvellement HTTP, rotation, révocation, refus d'un appareil par l'utilisateur, journal", async () => {
  const { app } = make();
  const s = (await app.inject({ method: "POST", url: "/v1/link/device/start", payload: { name: "Mac", platform: "darwin", os: "macOS 15", version: "0.2.0" } })).json();
  const info = (await app.inject({ method: "GET", url: `/v1/me/link/approve?code=${s.user_code}`, headers: user })).json();
  assert.equal(info.os, "macOS 15");
  assert.ok(info.scopes.includes("obs.control"));
  assert.equal((await app.inject({ method: "POST", url: "/v1/me/link/deny", payload: { code: s.user_code } })).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/v1/me/link/deny", headers: user, payload: { code: s.user_code } })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: "/v1/link/device/poll", payload: { device_code: s.device_code } })).json().status, "denied");

  const s2 = (await app.inject({ method: "POST", url: "/v1/link/device/start", payload: { name: "Mac" } })).json();
  await app.inject({ method: "POST", url: "/v1/me/link/approve", headers: user, payload: { code: s2.user_code } });
  const p = (await app.inject({ method: "POST", url: "/v1/link/device/poll", payload: { device_code: s2.device_code } })).json();
  assert.ok(p.token.startsWith("slk_") && p.refresh.startsWith("slr_") && p.expires_in === 3600);

  const r1 = await app.inject({ method: "POST", url: "/v1/link/token/refresh", payload: { refresh: p.refresh } });
  assert.equal(r1.statusCode, 200);
  assert.notEqual(r1.json().token, p.token);
  assert.equal((await app.inject({ method: "POST", url: "/v1/link/token/refresh", payload: { refresh: p.refresh } })).statusCode, 401); // rejoué
  assert.equal((await app.inject({ method: "GET", url: "/v1/link/backups", headers: { authorization: `Bearer ${p.token}` } })).statusCode, 401); // ancien accès mort
  assert.equal((await app.inject({ method: "GET", url: "/v1/link/backups", headers: { authorization: `Bearer ${r1.json().token}` } })).statusCode, 200);

  // Registre : jamais d'empreinte ; renommer ; révoquer.
  const list = (await app.inject({ method: "GET", url: "/v1/me/link/devices", headers: user })).json();
  assert.equal(list.devices.length, 1);
  assert.ok(!JSON.stringify(list).includes("hash"));
  const did = list.devices[0].id;
  assert.equal((await app.inject({ method: "PATCH", url: `/v1/me/link/devices/${did}`, headers: user, payload: { name: "Mac studio" } })).statusCode, 200);
  assert.equal((await app.inject({ method: "PATCH", url: `/v1/me/link/devices/${did}`, headers: { ...user, authorization: "Bearer user-v" }, payload: { name: "x" } })).statusCode, 404);
  assert.equal((await app.inject({ method: "DELETE", url: `/v1/me/link/devices/${did}`, headers: user })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: "/v1/link/token/refresh", payload: { refresh: r1.json().refresh } })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: "/v1/link/backups", headers: { authorization: `Bearer ${r1.json().token}` } })).statusCode, 401);
  const audit = (await app.inject({ method: "GET", url: "/v1/me/link/audit", headers: user })).json();
  assert.ok(audit.entries.some((e: { method: string }) => e.method === "device.revoke"));
});

test("API de l'appareil : renommer le poste, compte connecté, flux du compte (clés de publication jamais renvoyées)", async () => {
  const { app } = make();
  const dev = await connectDevice(app);
  const none = { authorization: "Bearer slk_" + "0".repeat(48) };
  for (const [m, u] of [["PATCH", "/v1/link/device"], ["GET", "/v1/link/me"], ["GET", "/v1/link/streams"]] as const)
    assert.equal((await app.inject({ method: m, url: u, headers: { ...none, "content-type": "application/json" }, payload: m === "PATCH" ? { name: "x" } : undefined })).statusCode, 401, u);

  const me = (await app.inject({ method: "GET", url: "/v1/link/me", headers: dev })).json();
  assert.deepEqual(me, { email: "mathis@example.com", name: "Mathis D", avatar_url: "https://img.example/a.png", plan: "pro", device_name: "Mac" });

  const st = (await app.inject({ method: "GET", url: "/v1/link/streams", headers: dev })).json();
  assert.equal(st.streams.length, 1); // le relais archivé n'est pas proposé
  assert.equal(st.streams[0].name, "Moblin");
  assert.match(st.streams[0].obs_srt_url, /^srt:\/\/relais\.test:\d+\?streamid=/);
  assert.ok(!JSON.stringify(st).includes("pub_secret")); // la clé de publication ne sort jamais

  const rn = await app.inject({ method: "PATCH", url: "/v1/link/device", headers: { ...dev, "content-type": "application/json" }, payload: { name: "  Régie  " } });
  assert.equal(rn.statusCode, 200);
  assert.equal(rn.json().name, "Régie");
  assert.equal((await app.inject({ method: "PATCH", url: "/v1/link/device", headers: { ...dev, "content-type": "application/json" }, payload: { name: "" } })).statusCode, 400);
  const list = (await app.inject({ method: "GET", url: "/v1/me/link/devices", headers: user })).json();
  assert.equal(list.devices[0].name, "Régie"); // se reflète dans le registre (Mes OBS, Contrôle à distance)
});

test("plugin : dernière version lue du manifeste (versions et fichiers validés, tailles réelles)", async () => {
  const { app, data } = make();
  assert.equal((await app.inject({ method: "GET", url: "/v1/plugin/latest" })).statusCode, 404); // rien de publié
  mkdirSync(join(data, "downloads"), { recursive: true });
  writeFileSync(join(data, "downloads", "SYXTEE-Link-mac.pkg"), "x".repeat(1234));
  writeFileSync(join(data, "downloads", "manifest.json"), JSON.stringify({ version: "0.4.0", released_at: "2026-10-07T10:00:00Z", notes: ["Pilotage d'OBS dans le plugin"], mac: { file: "SYXTEE-Link-mac.pkg", sha256: "a".repeat(64) }, windows: { file: "SYXTEE-Link-windows.exe", beta: true } }));
  const r = await app.inject({ method: "GET", url: "/v1/plugin/latest" });
  assert.equal(r.statusCode, 200);
  const j = r.json();
  assert.equal(j.version, "0.4.0");
  assert.deepEqual(j.macos, { available: true, url: "/dl/SYXTEE-Link-mac.pkg", size: 1234, sha256: "a".repeat(64), beta: false });
  assert.equal(j.windows.available, false); // fichier absent : pas proposé
  assert.equal(j.linux.available, false);
  // Manifeste piégé : version ou nom de fichier hors format = rejeté
  writeFileSync(join(data, "downloads", "manifest.json"), JSON.stringify({ version: "0.4.0; rm -rf", mac: { file: "../../etc/passwd" } }));
  assert.equal((await app.inject({ method: "GET", url: "/v1/plugin/latest" })).statusCode, 404);
  writeFileSync(join(data, "downloads", "manifest.json"), JSON.stringify({ version: "0.4.0", mac: { file: "../../etc/passwd" } }));
  assert.equal((await app.inject({ method: "GET", url: "/v1/plugin/latest" })).json().macos.available, false);
  const { compareVersions } = await import("../src/plugin.ts");
  assert.ok(compareVersions("0.3.0", "0.4.0") < 0 && compareVersions("0.10.0", "0.9.0") > 0 && compareVersions("1.0.0", "1.0.0") === 0);
});

test("aperçu vidéo : l'agent démarre et rend la session, le navigateur lit, MediaMTX autorise (route interne locale seulement)", async () => {
  const { app } = make();
  const dev = await connectDevice(app);
  // Sans jeton d'appareil : refusé. Compte non invité : refusé.
  assert.equal((await app.inject({ method: "POST", url: "/v1/link/preview/start" })).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/v1/me/link/preview/watch", headers: { ...user, authorization: "Bearer user-v" } })).statusCode, 403);
  // Rien en cours : pas d'adresse.
  assert.deepEqual((await app.inject({ method: "POST", url: "/v1/me/link/preview/watch", headers: user })).json(), { whep_url: null, ready: false });
  const st = (await app.inject({ method: "POST", url: "/v1/link/preview/start", headers: dev })).json();
  assert.match(st.whip_url, /^https:\/\/cam\.test\/obs_[0-9a-f]{32}\/whip$/);
  const w = (await app.inject({ method: "POST", url: "/v1/me/link/preview/watch", headers: user })).json();
  assert.equal(w.whep_url, st.whip_url.replace("/whip", "/whep"));
  assert.equal(w.ready, false); // MediaMTX absent en test
  // Autorisation de MediaMTX : la publication du chemin de la session est acceptée, un autre chemin refusé.
  const auth = (path: string, action: string) => app.inject({ method: "POST", url: "/internal/mediamtx/auth", remoteAddress: "127.0.0.1", payload: { path, action, protocol: "webrtc", ip: "9.9.9.9" } });
  const path = /obs_[0-9a-f]{32}/.exec(st.whip_url)![0];
  assert.equal((await auth(path, "publish")).statusCode, 200);
  assert.equal((await auth(path, "read")).statusCode, 200);
  assert.equal((await auth(`obs_${"1".repeat(32)}`, "publish")).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/v1/link/preview/stop", headers: dev })).statusCode, 200);
  assert.equal((await auth(path, "publish")).statusCode, 401);
  assert.deepEqual((await app.inject({ method: "POST", url: "/v1/me/link/preview/watch", headers: user })).json(), { whep_url: null, ready: false });
});

test("déclenchement de la bascule : lu et changé par le plugin sur ses propres flux ; débit du flux", async () => {
  const { app } = make();
  const dev = await connectDevice(app);
  const rid = RELAYS[0].id;
  const json = { ...dev, "content-type": "application/json" };
  const list = (await app.inject({ method: "GET", url: "/v1/link/streams", headers: dev })).json().streams;
  assert.equal(list[0].switch_trigger, "cut"); // par défaut
  // Sans jeton, valeur inconnue, flux d'un autre compte : refusés
  assert.equal((await app.inject({ method: "PATCH", url: `/v1/link/streams/${rid}`, headers: { "content-type": "application/json" }, payload: { switch_trigger: "sensitive" } })).statusCode, 401);
  assert.equal((await app.inject({ method: "PATCH", url: `/v1/link/streams/${rid}`, headers: json, payload: { switch_trigger: "n'importe quoi" } })).statusCode, 400);
  assert.equal((await app.inject({ method: "PATCH", url: "/v1/link/streams/00000000-0000-4000-8000-0000000000ff", headers: json, payload: { switch_trigger: "sensitive" } })).statusCode, 404);
  const ok = await app.inject({ method: "PATCH", url: `/v1/link/streams/${rid}`, headers: json, payload: { switch_trigger: "sensitive" } });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().switch_trigger, "sensitive");
  assert.equal((await app.inject({ method: "GET", url: "/v1/link/streams", headers: dev })).json().streams[0].switch_trigger, "sensitive");
  // Débit du flux en direct (arrondi), 0 hors direct ; jeton requis
  assert.deepEqual((await app.inject({ method: "GET", url: `/v1/link/streams/${rid}/status`, headers: dev })).json(), { live: true, kbps: 4322 });
  assert.deepEqual((await app.inject({ method: "GET", url: `/v1/link/streams/${RELAYS[1].id}/status`, headers: dev })).json(), { live: false, kbps: 0 });
  assert.equal((await app.inject({ method: "GET", url: `/v1/link/streams/${rid}/status` })).statusCode, 401);
});

test("sauvegardes légères par HTTP : begin, envoi des seuls fichiers manquants (vérifiés), validation, manifeste, lecture, quota unique", async () => {
  const { createHash } = await import("node:crypto");
  const { gzipSync } = await import("node:zlib");
  const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
  const { app } = make(5_000_000);
  const dev = await connectDevice(app);
  const json = { ...dev, "content-type": "application/json" };
  const col = Buffer.from('{"name":"SYXTEE"}');
  const logo = Buffer.alloc(2000, 7);
  const meta = { collection: "SYXTEE", collection_sha256: sha(col), collection_size: col.length, files: [{ sha256: sha(logo), size: logo.length }] };

  assert.equal((await app.inject({ method: "POST", url: "/v1/link/backups/begin", headers: { "content-type": "application/json" }, payload: meta })).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/v1/link/backups/begin", headers: json, payload: { ...meta, collection_sha256: "zz" } })).statusCode, 400);
  const begin = (await app.inject({ method: "POST", url: "/v1/link/backups/begin", headers: json, payload: meta })).json();
  assert.deepEqual(begin.missing.sort(), [sha(col), sha(logo)].sort());

  const put = (b: Buffer, size: number, enc: string, body = b) =>
    app.inject({ method: "PUT", url: `/v1/link/blobs/${sha(b)}`, headers: { ...dev, "content-type": "application/octet-stream", "x-syxtee-size": String(size), "x-syxtee-encoding": enc, "content-length": String(body.length) }, payload: Readable.from([body]) });
  // Mauvais contenu refusé, bon contenu accepté (JSON compressé, média tel quel), renvoi ignoré
  assert.equal((await put(logo, 2000, "raw", Buffer.alloc(2000, 8))).statusCode, 400);
  assert.equal((await put(col, col.length, "gzip", gzipSync(col))).statusCode, 200);
  assert.equal((await put(logo, 2000, "raw")).statusCode, 200);
  assert.equal((await put(logo, 2000, "raw")).json().existed, true);
  assert.equal((await app.inject({ method: "PUT", url: `/v1/link/blobs/${sha(logo)}`, headers: { ...dev, "content-type": "application/octet-stream", "x-syxtee-size": "2000", "x-syxtee-encoding": "zip" }, payload: Readable.from([logo]) })).statusCode, 400);

  const commit = await app.inject({ method: "POST", url: "/v1/link/backups/commit", headers: json, payload: { ...meta, name: "SYXTEE", obs: "32.2.2", host: "Mac", files: [{ sha256: sha(logo), size: 2000, name: "logo.png" }] } });
  assert.equal(commit.statusCode, 200, commit.body);
  const v1 = commit.json();
  assert.equal(v1.version, 1);
  // Même sauvegarde une 2e fois : plus rien à envoyer, 0 octet ajouté
  const again = (await app.inject({ method: "POST", url: "/v1/link/backups/begin", headers: json, payload: meta })).json();
  assert.deepEqual(again.missing, []);
  const v2 = (await app.inject({ method: "POST", url: "/v1/link/backups/commit", headers: json, payload: { ...meta, name: "SYXTEE", obs: "32.2.2", host: "Mac", files: [{ sha256: sha(logo), size: 2000, name: "logo.png" }] } })).json();
  assert.deepEqual([v2.version, v2.new_bytes], [2, 0]);
  // Validation refusée si un fichier n'a pas été envoyé
  const miss = await app.inject({ method: "POST", url: "/v1/link/backups/commit", headers: json, payload: { ...meta, collection_sha256: sha(Buffer.from("autre")), name: "X", obs: "", host: "" , files: [] } });
  assert.equal(miss.statusCode, 409);
  assert.equal(miss.json().missing.length, 1);

  // Liste (quota = octets uniques), manifeste, lecture d'un fichier ; un autre compte ne lit rien
  const list = (await app.inject({ method: "GET", url: "/v1/me/link/backups", headers: user })).json();
  assert.equal(list.backups.length, 2);
  assert.ok(list.backups.every((b: { format: number }) => b.format === 2));
  assert.ok(list.used < col.length + logo.length + 100); // une seule copie des fichiers
  const man = (await app.inject({ method: "GET", url: `/v1/link/backups/${v1.id}/manifest`, headers: dev })).json();
  assert.equal(man.files[0].name, "logo.png");
  const blob = await app.inject({ method: "GET", url: `/v1/link/blobs/${sha(col)}`, headers: dev });
  assert.equal(blob.statusCode, 200);
  assert.equal(blob.body, col.toString()); // décompressé à la lecture
  assert.equal((await app.inject({ method: "GET", url: `/v1/link/blobs/${sha(col)}` })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: `/v1/link/blobs/${sha(Buffer.from("inconnu"))}`, headers: dev })).statusCode, 404);
  // Suppression d'une version depuis le site : l'autre garde ses fichiers
  assert.equal((await app.inject({ method: "DELETE", url: `/v1/me/link/backups/${v1.id}`, headers: user })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: `/v1/link/blobs/${sha(logo)}`, headers: dev })).statusCode, 200);
});
