import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";



import { test } from "node:test";
import { Pipeline, parseTarget } from "../src/pipeline.ts";

const have = (bin: string, a: string[]) => { try { execFileSync(bin, a, { stdio: "ignore" }); return true; } catch { return false; } };
const ready = have("gst-launch-1.0", ["--version"]) && have("gst-inspect-1.0", ["x264enc"]) && have("gst-inspect-1.0", ["srtsink"]) && have("which", ["srt-live-transmit"]);

// Vrai pipeline GStreamer (mire + x264) -> SRT local -> srt-live-transmit en écoute : vérifie qu'un flux MPEG-TS valide arrive.
test("e2e : la mire arrive en MPEG-TS valide sur un récepteur SRT", { skip: !ready && "gstreamer, x264, srt ou srt-live-transmit absent" }, async () => {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const rx = spawn("srt-live-transmit", [`srt://127.0.0.1:${port}?mode=listener`, `file://con`], { stdio: ["ignore", "pipe", "ignore"] });
  const chunks: Buffer[] = [];
  rx.stdout.on("data", (b: Buffer) => chunks.push(b));
  await new Promise((r) => setTimeout(r, 500));
  const p = new Pipeline({ backend: "test", res: "720p30", bitrateKbps: 1500 }, parseTarget(`srt://127.0.0.1:${port}`, 200));
  p.start();
  await new Promise((r) => setTimeout(r, 4000));
  assert.equal(p.state, "live");
  await p.stop();
  rx.kill();
  const data = Buffer.concat(chunks);
  assert.ok(data.length > 20_000, `trop peu de données reçues : ${data.length}`);
  assert.equal(data[0], 0x47, "premier octet : synchro MPEG-TS");
  assert.equal(data[188], 0x47, "paquet TS suivant aligné sur 188 octets");
});
