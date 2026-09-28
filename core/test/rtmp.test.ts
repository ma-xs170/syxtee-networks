import assert from "node:assert/strict";
import { test } from "node:test";
import type { Relay } from "../src/relays.ts";
import { createRtmp, rtmpKey } from "../src/rtmp.ts";

const KEY = `live_${"b".repeat(32)}`;
const relay: Relay = {
  id: "10000000-0000-0000-0000-000000000002", user_id: "00000000-0000-0000-0000-000000000001", name: "Osmo Pocket 3", protocol: "rtmp", server: "nyc1",
  publish_id: KEY, play_id: "play_b", out_publish_id: "live_out_b", out_play_id: "play_out_b",
  cam_key: null, mode: "direct", status: "offline", archived: false, created_at: "", rotated_at: null, last_live_at: null,
};

function rtmp(paths: { name: string; ready: boolean }[] = []) {
  const fetchImpl = (async () => new Response(JSON.stringify({ items: paths }))) as unknown as typeof fetch;
  const eq = () => ({ eq, maybeSingle: async () => ({ data: null }) });
  const db = { from: () => ({ select: () => ({ eq }) }) };
  const r = createRtmp({ db: db as never, apiUrl: "http://mtx", rtspUrl: "rtsp://127.0.0.1:8554", output: (id) => `udp://out/${id}`, log: () => {}, fetchImpl });
  r.setKeys([relay, { ...relay, id: "x", protocol: "srtla", publish_id: `live_${"c".repeat(32)}` }]);
  return r;
}

test("chemin RTMP : live/<clé de diffusion> seulement", () => {
  assert.equal(rtmpKey(`live/${KEY}`), KEY);
  assert.equal(rtmpKey(KEY), null);
  assert.equal(rtmpKey(`live/${KEY}/x`), null);
  assert.equal(rtmpKey("live/play_abc"), null);
});

test("autorisation : publication RTMP d'un relais RTMP actif, lecture locale", async () => {
  const r = rtmp();
  assert.equal(await r.authorize({ action: "publish", protocol: "rtmp", path: `live/${KEY}` }), true);
  assert.equal(await r.authorize({ action: "publish", protocol: "rtsp", path: `live/${KEY}` }), false);
  // Clé d'un relais SRTLA : refusée en RTMP.
  assert.equal(await r.authorize({ action: "publish", protocol: "rtmp", path: `live/live_${"c".repeat(32)}` }), false);
  assert.equal(await r.authorize({ action: "publish", protocol: "rtmp", path: `live/live_${"d".repeat(32)}` }), false);
  assert.equal(await r.authorize({ action: "read", ip: "127.0.0.1", path: `live/${KEY}` }), true);
  assert.equal(await r.authorize({ action: "read", ip: "203.0.113.9", path: `live/${KEY}` }), false);
});

test("relais ffmpeg : démarre quand le chemin est prêt, s'arrête quand le relais disparaît", async () => {
  const r = rtmp([{ name: `live/${KEY}`, ready: true }, { name: "live/autre", ready: true }]);
  await r.sync();
  assert.equal(r.publishing(KEY), true);
  r.setKeys([]); // relais archivé ou clé régénérée
  await r.sync();
  assert.equal(r.publishing(KEY), false);
  r.stopAll();
});
