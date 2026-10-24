import assert from "node:assert/strict";
import { test } from "node:test";
import { moblinLink } from "./moblin-link.ts";

const decode = (link: string) => JSON.parse(decodeURIComponent(link.slice("moblin://?".length)));

test("lien Moblin : le stream seul", () => {
  const link = moblinLink("iPhone", "srtla://relais.syxtee-networks.fr:5000?streamid=live_abc");
  assert.ok(link.startsWith("moblin://?"));
  assert.deepEqual(decode(link), { streams: [{ name: "iPhone", url: "srtla://relais.syxtee-networks.fr:5000?streamid=live_abc" }] });
});

test("lien Moblin : avec le contrôle d'OBS, espaces retirés", () => {
  const stream = decode(moblinLink("Cam", "srtla://x:5000?streamid=a", { url: " ws://192.168.1.20:4455 ", password: "s&cret é" })).streams[0];
  assert.deepEqual(stream.obs, { webSocketUrl: "ws://192.168.1.20:4455", webSocketPassword: "s&cret é" });
});

test("lien Moblin : adresse OBS vide, pas de bloc obs", () => {
  assert.equal(decode(moblinLink("Cam", "srtla://x", { url: "  ", password: "x" })).streams[0].obs, undefined);
});
