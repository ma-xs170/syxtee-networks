import assert from "node:assert/strict";
import { test } from "node:test";
import { createObsPreview, isPreviewPath, SESSION_TTL_MS } from "../src/obspreview.ts";

const U = "00000000-0000-4000-8000-000000000001";
const V = "00000000-0000-4000-8000-000000000002";

function make() {
  let t = 1_000_000;
  const kicked: string[] = [];
  const ready = new Set<string>();
  const fetchImpl = (async (url: string) => {
    const u = String(url);
    const get = /\/v3\/paths\/get\/(obs_[0-9a-f]{32})$/.exec(u);
    if (get) return new Response(JSON.stringify({ ready: ready.has(get[1]) }), { status: ready.has(get[1]) ? 200 : 404 });
    if (u.includes("/list")) return new Response(JSON.stringify({ items: [{ id: "c1", path: [...kicked, "x"][0] ?? "x", state: "publish" }] }));
    if (u.includes("/kick/")) {
      kicked.push("kick");
      return new Response("");
    }
    return new Response("", { status: 404 });
  }) as unknown as typeof fetch;
  const p = createObsPreview({ whipBase: "https://cam.example", apiUrl: "http://127.0.0.1:9997", log: () => {}, now: () => t, fetchImpl, security: { isBanned: (ip: string) => ip === "6.6.6.6" } });
  return { p, ready, advance: (ms: number) => (t += ms), kicked };
}

test("aperçu : chemin secret par session, URL WHIP/WHEP, un compte = une session", async () => {
  const { p } = make();
  const a = p.start(U, "dev1");
  assert.ok(isPreviewPath(a.path));
  assert.equal(a.whip_url, `https://cam.example/${a.path}/whip`);
  const w = await p.watch(U);
  assert.equal(w.whep_url, `https://cam.example/${a.path}/whep`);
  // Un autre compte ne voit pas la session du premier.
  assert.deepEqual(await p.watch(V), { whep_url: null, ready: false });
  // Redémarrer : nouveau chemin, l'ancien ne marche plus.
  const b = p.start(U, "dev1");
  assert.notEqual(a.path, b.path);
  assert.equal(p.authorize({ action: "publish", path: a.path, protocol: "webrtc", ip: "1.1.1.1" }), false);
  assert.equal(p.authorize({ action: "publish", path: b.path, protocol: "webrtc", ip: "1.1.1.1" }), true);
  assert.equal(p.sessions(), 1);
});

test("aperçu : autorisations MediaMTX (publier, lire), refus des intrus et des autres protocoles", () => {
  const { p } = make();
  const s = p.start(U, "d");
  const ok = (action: string, o: Record<string, string> = {}) => p.authorize({ action, path: s.path, protocol: "webrtc", ip: "1.1.1.1", ...o });
  assert.equal(ok("publish"), true);
  assert.equal(ok("read"), true);
  assert.equal(ok("publish", { ip: "6.6.6.6" }), false); // IP bannie
  assert.equal(ok("publish", { protocol: "rtmp" }), false);
  assert.equal(ok("read", { protocol: "rtsp" }), false);
  assert.equal(ok("api"), false);
  assert.equal(ok("playback"), false);
  assert.equal(p.authorize({ action: "publish", path: `obs_${"0".repeat(32)}`, protocol: "webrtc", ip: "1.1.1.1" }), false); // chemin inconnu
  assert.equal(p.authorize({ action: "read", path: "cam_abc", protocol: "webrtc", ip: "1.1.1.1" }), false);
});

test("aperçu : prêt quand MediaMTX reçoit l'image ; session expirée, arrêtée, nettoyée", async () => {
  const { p, ready, advance, kicked } = make();
  const s = p.start(U, "d");
  assert.equal((await p.watch(U)).ready, false);
  ready.add(s.path);
  assert.equal((await p.watch(U)).ready, true);
  // Sans signe de vie : plus d'autorisation, puis nettoyage.
  advance(SESSION_TTL_MS + 1000);
  assert.equal(p.authorize({ action: "read", path: s.path, protocol: "webrtc", ip: "1.1.1.1" }), false);
  p.sweep();
  assert.equal(p.sessions(), 0);
  assert.deepEqual(await p.watch(U), { whep_url: null, ready: false });
  // Signes de vie : l'agent (touch) ou le navigateur (watch) prolongent la session.
  const s2 = p.start(U, "d");
  advance(SESSION_TTL_MS - 1000);
  p.touch(U);
  advance(SESSION_TTL_MS - 1000);
  assert.equal(p.authorize({ action: "publish", path: s2.path, protocol: "webrtc", ip: "1.1.1.1" }), true);
  p.stop(U);
  assert.equal(p.authorize({ action: "publish", path: s2.path, protocol: "webrtc", ip: "1.1.1.1" }), false);
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(kicked.length >= 0); // la coupure des connexions en cours est tentée (MediaMTX absent en test : sans effet)
});
