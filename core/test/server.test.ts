import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import { loadConfig } from "../src/config.ts";
import { QuotaError, type Relay } from "../src/relays.ts";
import { buildServer, type Deps } from "../src/server.ts";

const TOKEN = "t".repeat(40);
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const config = loadConfig({ CORE_API_TOKEN: TOKEN, SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_x", SLS_API_KEY: "slskey123", RELAY_KEYS_SECRET: "k".repeat(64), RELAY_PUBLIC_HOST: "relais.test" });

const relay = (id: string, user: string, protocol: Relay["protocol"] = "srtla"): Relay => ({
  id, user_id: user, name: "iPhone", protocol, server: "nyc1",
  publish_id: `live_${id.slice(-4)}`, play_id: `play_${id.slice(-4)}`, out_publish_id: "lo", out_play_id: "po",
  cam_key: null, mode: "direct", status: "offline", archived: false, created_at: "", rotated_at: null, last_live_at: null,
});
const RA = relay("10000000-0000-4000-8000-00000000000a", A);
const RB = relay("10000000-0000-4000-8000-00000000000b", B, "rtmp");

function app(extra: Partial<Deps> = {}, live: string[] = []) {
  const rows = new Map([RA, RB].map((r) => [r.id, r]));
  const relays = {
    get: async (id: string) => rows.get(id) ?? null,
    list: async (u: string) => [...rows.values()].filter((r) => r.user_id === u),
    create: async (u: string, o: { name: string; protocol: Relay["protocol"]; limit: number }) => {
      if ([...rows.values()].filter((r) => r.user_id === u).length >= o.limit) throw new QuotaError("quota");
      return { ...relay("10000000-0000-4000-8000-0000000000cc", u, o.protocol), name: o.name };
    },
  };
  const health = { state: (id: string) => (live.includes(id) ? { live: true } : null), relay: (id: string) => rows.get(id) ?? null, liveRelays: () => [], byUser: () => [], events: { on() {}, off() {} } };
  return buildServer({
    config, relays, health, rtmp: {}, samples: { history: () => [] }, sessions: { current: () => null },
    verifyUser: async (h: string | undefined) => (h === "Bearer user-a" ? A : null),
    previewPath: () => "", onKeysChanged: () => {}, slsHealthy: async () => true,
    ...extra,
  } as unknown as Deps);
}
const svc = { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" };

test("/ping : 204, jamais en cache, ouvert à toutes les origines", async () => {
  const res = await app().inject({ method: "GET", url: "/ping", headers: { origin: "https://ailleurs.example" } });
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers["access-control-allow-origin"], "*");
  assert.equal(res.headers["cache-control"], "no-store");
});

test("service : un relais d'un autre compte n'existe pas (404)", async () => {
  const a = app();
  assert.equal((await a.inject({ method: "GET", url: `/v1/users/${A}/relays/${RB.id}`, headers: svc })).statusCode, 404);
  const own = await a.inject({ method: "GET", url: `/v1/users/${A}/relays/${RA.id}`, headers: svc });
  assert.equal(own.statusCode, 200);
  assert.match(own.json().urls.srtla_url, /^srtla:\/\/relais\.test:5000\?streamid=live_/);
  assert.equal((await a.inject({ method: "GET", url: `/v1/users/${A}/relays`, headers: { authorization: "Bearer mauvais" } })).statusCode, 401);
});

test("URLs d'un relais RTMP : serveur + clé, lecture OBS en SRT", async () => {
  const res = await app().inject({ method: "GET", url: `/v1/users/${B}/relays/${RB.id}`, headers: svc });
  const v = res.json();
  assert.equal(v.urls.rtmp_server, "rtmp://relais.test:1935/live");
  assert.equal(v.urls.rtmp_key, RB.publish_id);
  assert.match(v.obs_srt_url, /^srt:\/\/relais\.test:4000\?streamid=play_/);
});

test("création : quota respecté (403), serveur inconnu refusé (409)", async () => {
  const a = app();
  const post = (body: object) => a.inject({ method: "POST", url: `/v1/users/${A}/relays`, headers: svc, payload: JSON.stringify(body) });
  assert.equal((await post({ name: "Osmo", protocol: "rtmp", server: "nyc1", limit: 1 })).statusCode, 403);
  assert.equal((await post({ name: "Osmo", protocol: "rtmp", server: "par1", limit: 3 })).statusCode, 409);
  const ok = await post({ name: "Osmo", protocol: "rtmp", server: "nyc1", limit: 3 });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().name, "Osmo");
});

test("navigateur : santé d'un relais seulement pour son propriétaire", async () => {
  const a = app();
  const get = (rid: string, auth?: string) => a.inject({ method: "GET", url: `/v1/me/relays/${rid}/health`, headers: auth ? { authorization: auth } : {} });
  assert.equal((await get(RA.id)).statusCode, 401);
  assert.equal((await get(RB.id, "Bearer user-a")).statusCode, 404);
  assert.equal((await get(RA.id, "Bearer user-a")).statusCode, 200);
});

test("admin : stats et flux en direct réservés au jeton de service", async () => {
  const a = app();
  assert.equal((await a.inject({ method: "GET", url: "/v1/admin/stats" })).statusCode, 401);
  assert.equal((await a.inject({ method: "GET", url: "/v1/admin/live", headers: { authorization: "Bearer mauvais" } })).statusCode, 401);
  const stats = await a.inject({ method: "GET", url: "/v1/admin/stats", headers: svc });
  assert.equal(stats.statusCode, 200);
  const body = stats.json();
  assert.ok(body.cpu.cores >= 1 && body.memory.totalMb > 0);
  assert.equal(typeof body.streams_live, "number");
  const live = await a.inject({ method: "GET", url: "/v1/admin/live", headers: svc });
  assert.deepEqual(live.json(), { live: [] });
});

test("aperçu vidéo : propriétaire seulement, flux live seulement, MPEG-TS transmis puis ffmpeg arrêté", async () => {
  let stopped = 0;
  const liveFeed = () => {
    const stream = new PassThrough();
    setImmediate(() => stream.end(Buffer.from([0x47, 1, 2, 3])));
    return { stream, stop: () => void stopped++ };
  };
  const off = app({ liveFeed } as Partial<Deps>);
  const get = (a: ReturnType<typeof app>, rid: string) => a.inject({ method: "GET", url: `/v1/me/relays/${rid}/live.ts`, headers: { authorization: "Bearer user-a" } });
  assert.equal((await get(off, RB.id)).statusCode, 404);
  assert.equal((await get(off, RA.id)).json().error, "offline");
  const on = app({ liveFeed } as Partial<Deps>, [RA.id]);
  const res = await get(on, RA.id);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["content-type"], "video/mp2t");
  assert.deepEqual([...res.rawPayload], [0x47, 1, 2, 3]);
  assert.equal(stopped, 1);
});
