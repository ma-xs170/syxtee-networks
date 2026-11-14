import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLevel, parseProbe } from "../src/preview.ts";

test("parseLevel lit canal, mesure et niveau, et borne le silence", () => {
  assert.deepEqual(parseLevel("lavfi.astats.1.RMS_level=-21.07"), { ch: 1, kind: "rms", v: -21.07 });
  assert.deepEqual(parseLevel("lavfi.astats.2.Peak_level=-3.5"), { ch: 2, kind: "peak", v: -3.5 });
  assert.deepEqual(parseLevel("lavfi.astats.2.RMS_level=-inf"), { ch: 2, kind: "rms", v: -90 });
  assert.equal(parseLevel("frame:0 pts:0"), null);
});

test("parseProbe lit résolution, codec et cadence", () => {
  const out = JSON.stringify({ streams: [{ width: 1920, height: 1080, codec_name: "h264", avg_frame_rate: "30000/1001" }] });
  assert.deepEqual(parseProbe(out), { width: 1920, height: 1080, codec: "h264", fps: 29.97 });
  assert.deepEqual(parseProbe("pas du json"), { width: null, height: null, codec: null, fps: null });
});
