import assert from "node:assert/strict";
import { test } from "node:test";
import { BitrateController } from "../src/bitrate.ts";
import { videoElements } from "../src/hardware.ts";
import { classify, ipsFile } from "../src/links.ts";
import { gstArgs, parseTarget, sinkUri } from "../src/pipeline.ts";

test("parseTarget : srt direct et srtla", () => {
  const a = parseTarget("srt://relais.example.fr:9000?streamid=abc");
  assert.deepEqual([a.kind, a.host, a.port, a.streamid], ["srt", "relais.example.fr", 9000, "abc"]);
  const b = parseTarget("srtla://relais.example.fr:5000?streamid=abc", 800, 5100);
  assert.equal(b.kind, "srtla");
  assert.equal(sinkUri(b), "srt://127.0.0.1:5100?mode=caller&latency=800&streamid=abc");
});

test("parseTarget : refuse un protocole ou une URL incomplète", () => {
  assert.throws(() => parseTarget("rtmp://x:1935/live"), /non pris en charge/);
  assert.throws(() => parseTarget("srt://x"), /hôte et un port/);
});

test("gstArgs : chaque backend produit un pipeline H.264 -> TS -> SRT", () => {
  const t = parseTarget("srt://h:1?streamid=k");
  for (const [backend, enc] of [["mac", "vtenc_h264"], ["test", "x264enc"], ["rk3588", "mpph264enc"]] as const) {
    const args = gstArgs({ backend, res: "1080p60", bitrateKbps: 5000 }, t);
    assert.ok(args.includes(enc), backend);
    assert.ok(args.includes("h264parse") && args.includes("mpegtsmux") && args.includes("srtsink"), backend);
    assert.ok(args.some((a) => a.includes("framerate=60/1")), backend);
  }
});

test("rk3588 : le débit matériel est en bits/s", () => {
  assert.ok(videoElements({ backend: "rk3588", res: "720p30", bitrateKbps: 3000 }).includes("bitrate=3000000"));
});

test("classify : noms d'interfaces", () => {
  assert.equal(classify("wlan0", "linux"), "wifi");
  assert.equal(classify("enP4p1s0", "linux"), "eth"); // nom des cartes Rockchip
  assert.equal(classify("eth0", "linux"), "eth");
  assert.equal(classify("enp1s0", "linux"), "eth");
  assert.equal(classify("wwan0", "linux"), "cell");
  assert.equal(classify("usb0", "linux"), "usb");
  assert.equal(classify("en0", "darwin"), "wifi");
  assert.equal(classify("en5", "darwin"), "eth");
});

test("ipsFile : une adresse par ligne", () => {
  assert.equal(ipsFile([{ name: "a", address: "1.1.1.1", kind: "wifi" }, { name: "b", address: "2.2.2.2", kind: "eth" }]), "1.1.1.1\n2.2.2.2\n");
});

test("bitrate : baisse vite sous perte, remonte lentement, reste borné", () => {
  const c = new BitrateController(4000);
  assert.equal(c.update({ rttMs: 40, lossPct: 0 }), 4000);
  assert.equal(c.update({ rttMs: 40, lossPct: 3 }), 3000);
  assert.equal(c.update({ rttMs: 40, lossPct: 10 }), 1500);
  for (let i = 0; i < 40; i++) c.update({ rttMs: 40, lossPct: 10 });
  assert.equal(c.kbps, 800); // plancher
  let up = 0;
  for (let i = 0; i < 3; i++) up = c.update({ rttMs: 40, lossPct: 0 });
  assert.equal(up, 840); // +5 % après 3 secondes saines
  for (let i = 0; i < 1000; i++) c.update({ rttMs: 40, lossPct: 0 });
  assert.equal(c.kbps, 8000); // plafond
});

test("bitrate : un RTT qui explose compte comme congestion", () => {
  const c = new BitrateController(4000);
  c.update({ rttMs: 30, lossPct: 0 });
  assert.equal(c.update({ rttMs: 400, lossPct: 0 }), 3000);
});
