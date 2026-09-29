import assert from "node:assert/strict";
import { test } from "node:test";
import { newStreamIds } from "../src/ids.ts";
import { BARS_Y, mireSvg } from "../src/mire.ts";
import { previewArgs } from "../src/preview.ts";
import { regieArgs } from "../src/regie.ts";

test("identifiants : préfixes et 128 bits aléatoires", () => {
  const a = newStreamIds();
  const b = newStreamIds();
  assert.match(a.publish_id, /^live_[0-9a-f]{32}$/);
  assert.match(a.out_play_id, /^play_out_[0-9a-f]{32}$/);
  assert.notEqual(a.publish_id, b.publish_id);
});

test("mire : textes échappés, bande de 7 couleurs", () => {
  const svg = mireSvg({ width: 1280, height: 720, relay: "nyc1", source: "<script>&", session: "7F3A-21C4" });
  assert.ok(svg.includes(">&lt;script&gt;&amp;</text>"));
  assert.ok(svg.includes(">SIGNAL</text>") && svg.includes(">PERDU</text>"));
  assert.equal((svg.match(new RegExp(`y="${BARS_Y}"`, "g")) ?? []).length, 7);
});

test("mire : source trop longue coupée", () => {
  const svg = mireSvg({ width: 1280, height: 720, relay: "nyc1", source: "x".repeat(60), session: "7F3A-21C4" });
  assert.ok(svg.includes(`>${"x".repeat(27)}…</text>`));
});

test("régie : entrée = play du téléphone, sortie = publication régie, bascule à 1,5 s", () => {
  const args = regieArgs({
    srtHost: "sls", playPort: 4000, publishPort: 4001, width: 1280, height: 720, fps: 30, bitrateKbps: 4000,
    timeoutMs: 1500, beep: false, playId: "play_x", outPublishId: "live_out_y", mireSvgPath: "/data/mire/u.svg",
  });
  assert.ok(args.includes("uri=srt://sls:4000?streamid=play_x&latency=200"));
  assert.ok(args.includes("uri=srt://sls:4001?streamid=live_out_y"));
  assert.equal(args.filter((a) => a === "timeout=1500000000").length, 2);
  assert.ok(args.includes("wave=silence"));
  assert.ok(args.includes('font-desc="Geist Mono 11"'));
  assert.ok(args.includes("auto-resize=false"));
});

test("aperçu : images-clés seules, une image toutes les 3 s", () => {
  const args = previewArgs({ host: "sls", port: 4000, playId: "play_x", out: "/d/u.jpg", intervalS: 3 });
  assert.deepEqual(args.slice(args.indexOf("-skip_frame"), args.indexOf("-skip_frame") + 2), ["-skip_frame", "nokey"]);
  assert.ok(args.includes("fps=1/3,scale=640:-2"));
});

test("nettoyage du relais : seulement les paires SYXTEE sans clé en base", async () => {
  const { orphanPair } = await import("../src/relays.ts");
  const known = new Set(["play_ok"]);
  assert.equal(orphanPair({ player: "play_old", description: "syxtee:u1:r1" }, known), true);
  assert.equal(orphanPair({ player: "play_out_old", description: "syxtee-regie:u1:r1" }, known), true);
  assert.equal(orphanPair({ player: "play_ok", description: "syxtee:u2" }, known), false);
  assert.equal(orphanPair({ player: "live", description: "Mon stream perso" }, known), false);
  assert.equal(orphanPair({ player: "live" }, known), false);
});
