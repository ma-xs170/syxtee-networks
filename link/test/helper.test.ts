import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// Page locale de l'agent : protections, connexion par le navigateur (faux serveur), sauvegarde avec progression, restauration.

const PORT = 47990;
process.env.SYXTEE_LINK_PORT = String(PORT);
process.env.SYXTEE_LINK_NO_OPEN = "1";
const { startHelper } = await import("../src/helper.ts");

/** Requête avec un en-tête Host choisi (fetch ne permet pas de le changer). */
const withHost = (path: string, host: string, csrf: string) =>
  new Promise<number>((resolve, reject) => {
    const r = request({ host: "127.0.0.1", port: PORT, path, headers: { host, "x-syxtee": csrf } }, (res) => (res.resume(), resolve(res.statusCode ?? 0)));
    r.on("error", reject);
    r.end();
  });

const call = (path: string, o: { body?: unknown; csrf?: string | null } = {}) =>
  fetch(`http://127.0.0.1:${PORT}${path}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { ...(o.csrf === null ? {} : { "x-syxtee": o.csrf ?? "" }), "content-type": "application/json" },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });

test("page locale : jeton requis, hôte contrôlé, connexion par le navigateur, sauvegarde", async () => {
  process.env.SYXTEE_LINK_HOME = mkdtempSync(join(tmpdir(), "slk-home-"));
  const obs = mkdtempSync(join(tmpdir(), "slk-obs-"));
  process.env.OBS_CONFIG_DIR = obs;
  process.env.SYXTEE_LINK_MEDIA = join(mkdtempSync(join(tmpdir(), "slk-med-")), "M");
  mkdirSync(join(obs, "basic", "scenes"), { recursive: true });
  const media = join(obs, "logo.png");
  writeFileSync(media, "PNG");
  writeFileSync(join(obs, "basic", "scenes", "SYXTEE.json"), JSON.stringify({ name: "SYXTEE", sources: [{ settings: { file: media } }] }));

  // Faux serveur SYXTEE : connexion par appareil + sauvegardes.
  const uploads: { query: string; size: number; auth: string }[] = [];
  let approved = false;
  const core = createServer(async (req, res) => {
    const send = (code: number, v: unknown) => (res.writeHead(code, { "content-type": "application/json" }), res.end(JSON.stringify(v)));
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname === "/v1/link/device/start") return send(200, { device_code: "dc", user_code: "ABCD2345", expires_in: 600, interval: 1 });
    if (url.pathname === "/v1/link/device/poll") return send(200, approved ? { status: "approved", token: `slk_${"a".repeat(48)}`, device_id: "d" } : { status: "pending" });
    if (url.pathname === "/v1/link/backups" && req.method === "POST") {
      const parts: Buffer[] = [];
      for await (const c of req) parts.push(c as Buffer);
      uploads.push({ query: url.search, size: Buffer.concat(parts).length, auth: String(req.headers.authorization) });
      return send(200, { id: "11111111-1111-4111-8111-111111111111", size: Buffer.concat(parts).length });
    }
    if (url.pathname === "/v1/link/backups") return send(200, { backups: [], used: 0, quota: 5 * 1024 ** 3 });
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => core.listen(0, "127.0.0.1", r));
  const coreUrl = `http://127.0.0.1:${(core.address() as AddressInfo).port}`;
  writeFileSync(join(process.env.SYXTEE_LINK_HOME, "config.json"), JSON.stringify({ core: coreUrl }));

  const h = startHelper({ openOnFirstRun: false });
  try {
  await new Promise((r) => setTimeout(r, 100));

  // Page : le jeton est dans le HTML, jamais sans lui.
  const html = await (await call("/", { csrf: null })).text();
  const csrf = /var CSRF="([0-9a-f]{48})"/.exec(html)?.[1];
  assert.ok(csrf, "jeton dans la page");
  assert.equal((await call("/api/state", { csrf: null })).status, 403);
  assert.equal((await call("/api/state", { csrf: "faux" })).status, 403);
  assert.equal(await withHost("/api/state", "evil.example", csrf), 403); // DNS rebinding
  assert.equal(await withHost("/api/state", `evil.example:${PORT}`, csrf), 403);
  assert.equal(await withHost("/api/state", `localhost:${PORT}`, csrf), 200);

  let st = await (await call("/api/state", { csrf })).json();
  assert.equal(st.paired, false);
  assert.equal(st.login.state, "idle");

  // Connexion : le plugin affiche le code, l'utilisateur approuve sur le site, le jeton arrive.
  await call("/api/login/start", { csrf, body: {} });
  await new Promise((r) => setTimeout(r, 150));
  st = await (await call("/api/state", { csrf })).json();
  assert.equal(st.login.state, "waiting");
  assert.equal(st.login.userCode, "ABCD2345");
  assert.ok(st.login.url.endsWith("/link?code=ABCD2345"));
  approved = true;
  for (let i = 0; i < 30 && !st.paired; i++) {
    await new Promise((r) => setTimeout(r, 200));
    st = await (await call("/api/state", { csrf })).json();
  }
  assert.equal(st.paired, true, JSON.stringify([st.login, st.logs]));
  assert.equal(st.onboarded, false); // la proposition de sauvegarde vient en premier
  assert.equal(JSON.parse(readFileSync(join(process.env.SYXTEE_LINK_HOME, "config.json"), "utf8")).token, `slk_${"a".repeat(48)}`);

  // Collections visibles, sauvegarde envoyée au serveur avec le jeton d'appareil.
  const cols = await (await call("/api/collections", { csrf })).json();
  assert.deepEqual(cols.collections.map((c: { name: string; media: number }) => [c.name, c.media]), [["SYXTEE", 1]]);
  await call("/api/backup", { csrf, body: { collection: "SYXTEE" } });
  for (let i = 0; i < 40 && st.status.job?.state !== "done"; i++) {
    await new Promise((r) => setTimeout(r, 150));
    st = await (await call("/api/state", { csrf })).json();
  }
  assert.equal(st.status.job?.state, "done", JSON.stringify(st.status.job));
  assert.equal(uploads.length, 1);
  assert.ok(uploads[0].size > 0);
  assert.equal(uploads[0].auth, `Bearer slk_${"a".repeat(48)}`);
  assert.match(uploads[0].query, /collection=SYXTEE/);
  assert.match(uploads[0].query, /media=1/);

  await call("/api/onboarded", { csrf, body: {} });
  st = await (await call("/api/state", { csrf })).json();
  assert.equal(st.onboarded, true);
  const cloud = await (await call("/api/cloud", { csrf })).json();
  assert.equal(cloud.quota, 5 * 1024 ** 3);

  await call("/api/unpair", { csrf, body: {} });
  st = await (await call("/api/state", { csrf })).json();
  assert.equal(st.paired, false);
  } finally {
    h.stop();
    core.close();
  }
});
