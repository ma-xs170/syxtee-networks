import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDestination, createStudio, isPublicIp, isStudioPath, studioArgs } from "../src/studio.ts";

const U = "00000000-0000-4000-8000-000000000001";
const PUBLIC = async () => ["52.1.2.3"];

test("adresses publiques et privées", () => {
  for (const ip of ["8.8.8.8", "52.1.2.3", "2606:4700::1"]) assert.equal(isPublicIp(ip), true, ip);
  for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.2", "172.16.0.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) assert.equal(isPublicIp(ip), false, ip);
});

test("destination : rtmp(s) public seulement (anti-SSRF)", async () => {
  assert.equal(await checkDestination({ name: "t", url: "rtmp://live.twitch.tv/app/live_abc" }, PUBLIC), null);
  assert.equal(await checkDestination({ name: "k", url: "rtmps://x.global-contribute.live-video.net:443/app/sk_abc" }, PUBLIC), null);
  assert.equal(await checkDestination({ name: "x", url: "http://live.twitch.tv/app/k" }, PUBLIC), "protocol");
  assert.equal(await checkDestination({ name: "x", url: "file:///etc/passwd" }, PUBLIC), "protocol");
  assert.equal(await checkDestination({ name: "x", url: "rtmp://127.0.0.1/app/k" }, PUBLIC), "host_private");
  assert.equal(await checkDestination({ name: "x", url: "rtmp://169.254.169.254/latest" }, PUBLIC), "host_private");
  assert.equal(await checkDestination({ name: "x", url: "rtmp://localhost/app/k" }, PUBLIC), "host_private");
  assert.equal(await checkDestination({ name: "x", url: "rtmp://[::1]/app/k" }, PUBLIC), "host_private");
  assert.equal(await checkDestination({ name: "x", url: "rtmp://user:pw@live.twitch.tv/app/k" }, PUBLIC), "url_invalid");
  assert.equal(await checkDestination({ name: "x", url: "rtmp://evil.example/app/k" }, async () => ["10.0.0.1"]), "host_private");
  assert.equal(await checkDestination({ name: "x", url: "rtmp://evil.example/app/k" }, async () => ["52.1.2.3", "127.0.0.1"]), "host_private");
  assert.equal(
    await checkDestination({ name: "x", url: "rtmp://nope.example/app/k" }, async () => {
      throw new Error("ENOTFOUND");
    }),
    "host_unresolved",
  );
});

test("ffmpeg : un encodage, une sortie tee par destination, onfail=ignore", () => {
  const a = studioArgs("rtsp://127.0.0.1:8554", "stu_" + "a".repeat(32), ["rtmp://a/app/k1", "rtmps://b/app/k2"], 4500);
  const tee = a[a.length - 1];
  assert.equal(a.filter((x) => x === "-c:v").length, 1);
  assert.equal(tee, "[f=flv:onfail=ignore]rtmp://a/app/k1|[f=flv:onfail=ignore]rtmps://b/app/k2");
  assert.ok(a.includes("4500k"));
  assert.ok(studioArgs("r", "p", ["rtmp://a/b"], 99999).includes("8000k"));
  assert.ok(studioArgs("r", "p", ["rtmp://a/b"], 1).includes("1000k"));
});

function setup() {
  const logs: string[] = [];
  let t = 1_000_000;
  let ready: string[] = [];
  const fetchImpl = (async (url: string) => {
    if (url.includes("/v3/paths/list")) return { ok: true, json: async () => ({ items: ready.map((name) => ({ name, ready: true })) }) };
    if (url.includes("/list")) return { ok: true, json: async () => ({ items: [] }) };
    return { ok: true };
  }) as unknown as typeof fetch;
  const studio = createStudio({ apiUrl: "http://x", rtspUrl: "rtsp://127.0.0.1:1", whipBase: "https://cam.example", log: (m) => logs.push(m), fetchImpl, resolve: PUBLIC, now: () => t });
  return { studio, logs, setReady: (p: string[]) => (ready = p), tick: (ms: number) => (t += ms) };
}

test("session : compte autorisé seulement, chemin secret, un seul à la fois", async () => {
  const { studio } = setup();
  assert.deepEqual(await studio.open(U, [{ name: "T", url: "rtmp://live.twitch.tv/app/k" }], 4500), { error: "not_allowed" });
  studio.setUsers(new Set([U]));
  assert.deepEqual(await studio.open(U, [], 4500), { error: "destinations" });
  assert.deepEqual(await studio.open(U, [{ name: "T", url: "rtmp://127.0.0.1/app/k" }], 4500), { error: "host_private" });
  const a = await studio.open(U, [{ name: "T", url: "rtmp://live.twitch.tv/app/k" }], 4500);
  assert.ok("path" in a && isStudioPath(a.path) && a.whip_url === `https://cam.example/${a.path}/whip`);
  const b = await studio.open(U, [{ name: "T", url: "rtmp://live.twitch.tv/app/k" }], 4500);
  assert.ok("path" in a && "path" in b && a.path !== b.path);
  const pa = "path" in a ? a.path : "";
  const pb = "path" in b ? b.path : "";
  // L'ancien chemin n'est plus publiable, le nouveau l'est, en WebRTC seulement.
  assert.equal(studio.authorize({ action: "publish", path: pa, protocol: "webrtc", ip: "1.2.3.4" }), false);
  assert.equal(studio.authorize({ action: "publish", path: pb, protocol: "webrtc", ip: "1.2.3.4" }), true);
  assert.equal(studio.authorize({ action: "publish", path: pb, protocol: "rtmp", ip: "1.2.3.4" }), false);
  assert.equal(studio.authorize({ action: "read", path: "x", protocol: "rtsp", ip: "9.9.9.9" }), false);
  assert.equal(studio.authorize({ action: "read", path: "x", protocol: "rtsp", ip: "127.0.0.1" }), true);
  studio.stopAll();
});

test("sync : démarre à la publication, jamais d'adresse RTMP dans les logs, expire si personne ne publie", async () => {
  const { studio, logs, setReady, tick } = setup();
  studio.setUsers(new Set([U]));
  const s = await studio.open(U, [{ name: "T", url: "rtmp://live.twitch.tv/app/live_SECRETKEY" }], 4500);
  assert.ok("path" in s);
  assert.equal(studio.status(U).state, "waiting");
  setReady(["path" in s ? s.path : ""]);
  await studio.sync();
  assert.equal(studio.status(U).state, "live");
  assert.ok(logs.some((l) => l.includes("en direct")));
  assert.ok(!logs.some((l) => l.includes("SECRETKEY")));
  setReady([]);
  await studio.sync(); // le navigateur est parti : la session se ferme
  assert.equal(studio.status(U).state, "idle");
  const s2 = await studio.open(U, [{ name: "T", url: "rtmp://live.twitch.tv/app/k" }], 4500);
  assert.ok("path" in s2);
  tick(11 * 60_000);
  await studio.sync();
  assert.equal(studio.status(U).state, "idle");
  studio.stopAll();
});
