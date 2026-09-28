import assert from "node:assert/strict";
import { test } from "node:test";
import { createCam, isCamKey, newCamKey, relayArgs } from "../src/cam.ts";
import type { Relay, RelayStore } from "../src/relays.ts";

const row: Relay = {
  id: "10000000-0000-0000-0000-000000000001", user_id: "00000000-0000-0000-0000-000000000001", name: "iPhone", protocol: "srtla", server: "nyc1",
  publish_id: "live_a", play_id: "play_a", out_publish_id: "live_out_a", out_play_id: "play_out_a",
  mode: "direct", status: "offline", archived: false, created_at: "", rotated_at: null, last_live_at: null, cam_key: `cam_${"a".repeat(32)}`,
};

function cam(paths: { name: string; ready: boolean }[] = []) {
  const fetchImpl = (async () => new Response(JSON.stringify({ items: paths }))) as unknown as typeof fetch;
  const eq = () => ({ eq, maybeSingle: async () => ({ data: null }) });
  const db = { from: () => ({ select: () => ({ eq }) }) };
  const c = createCam({
    db: db as never, relays: {} as RelayStore, apiUrl: "http://mtx", rtspUrl: "rtsp://127.0.0.1:8554", whipBase: "https://cam.example",
    output: (id) => `udp://out/${id}`, log: () => {}, fetchImpl,
  });
  c.setKeys([row]);
  return c;
}

test("clé caméra : format cam_ + 128 bits", () => {
  const k = newCamKey();
  assert.ok(isCamKey(k));
  assert.notEqual(k, newCamKey());
  assert.equal(isCamKey("cam_xyz"), false);
});

test("autorisation MediaMTX : publication WebRTC avec une clé connue seulement", async () => {
  const c = cam();
  assert.equal(await c.authorize({ action: "publish", protocol: "webrtc", path: row.cam_key! }), true);
  assert.equal(await c.authorize({ action: "publish", protocol: "rtsp", path: row.cam_key! }), false);
  assert.equal(await c.authorize({ action: "publish", protocol: "webrtc", path: `cam_${"b".repeat(32)}` }), false);
  assert.equal(await c.authorize({ action: "read", ip: "127.0.0.1", path: row.cam_key! }), true);
  assert.equal(await c.authorize({ action: "read", ip: "203.0.113.9", path: row.cam_key! }), false);
  assert.equal(await c.authorize({ action: "playback", ip: "127.0.0.1" }), false);
});

test("URL WHIP et arguments du relais (vidéo copiée, son AAC)", () => {
  const c = cam();
  assert.equal(c.whipUrl(row.cam_key!), `https://cam.example/${row.cam_key}/whip`);
  const a = relayArgs("rtsp://127.0.0.1:8554", row.cam_key!, "srt://x");
  assert.deepEqual(a.slice(a.indexOf("-c:v"), a.indexOf("-c:v") + 2), ["-c:v", "copy"]);
  assert.ok(a.includes("aac"));
  assert.equal(a.at(-1), "srt://x");
});

test("relais : démarre quand le chemin est prêt, s'arrête sinon", async () => {
  const c = cam([{ name: row.cam_key!, ready: true }, { name: "autre", ready: true }]);
  await c.syncRelays();
  assert.equal(c.publishing(row.cam_key!), true);
  c.stopAll();
  assert.equal(c.publishing(row.cam_key!), false);
});
