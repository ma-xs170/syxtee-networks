import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Controller, maskUrl } from "../src/controller.ts";
import { createUiServer } from "../src/server.ts";

const have = (bin: string, a: string[]) => { try { execFileSync(bin, a, { stdio: "ignore" }); return true; } catch { return false; } };

async function boot(pin?: string, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "syxtee-ui-"));
  const ctl = new Controller({ dataDir: dir, overrides: { backend: "test", ...overrides } });
  const srv = createUiServer(ctl, { pin });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  const call = async (path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(base + path, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, json: (await res.json().catch(() => null)) as any, res };
  };
  return { ctl, srv, base, dir, call, close: async () => { await ctl.stop(); srv.close(); } };
}

test("la page d'accueil est servie avec une CSP", async () => {
  const t = await boot();
  const res = await fetch(t.base + "/");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.match(await res.text(), /SYXTEE Encodeur/);
  await t.close();
});

test("réglages : validation, masquage de la clé, permissions du fichier", async () => {
  const t = await boot();
  const bad = await t.call("/api/settings", { bitrateKbps: 99999 });
  assert.equal(bad.status, 400);
  assert.match(bad.json.error, /500 et 15000/);
  assert.equal((await t.call("/api/settings", { url: "http://x:80" })).status, 400);

  const ok = await t.call("/api/settings", { url: "srt://relais.example.fr:9000?streamid=cle-secrete-123", res: "720p30", bitrateKbps: 2500, latencyMs: 800 });
  assert.equal(ok.status, 200);
  assert.ok(!JSON.stringify(ok.json).includes("cle-secrete-123"), "la clé ne doit jamais être renvoyée à l'écran");
  assert.equal(ok.json.settings.hasUrl, true);
  assert.equal(ok.json.bonding, "srt");

  // Renvoyer l'URL masquée (le champ de l'écran) ne doit pas écraser la vraie clé.
  await t.call("/api/settings", { url: ok.json.settings.url, bitrateKbps: 3000 });
  assert.match(readFileSync(join(t.dir, "settings.json"), "utf8"), /cle-secrete-123/);
  assert.equal(statSync(join(t.dir, "settings.json")).mode & 0o777, 0o600);
  await t.close();
});

test("PIN : refusé sans PIN, accepté avec", async () => {
  const t = await boot("4821");
  assert.equal((await t.call("/api/state")).status, 401);
  assert.equal((await t.call("/api/state", undefined, { "x-pin": "0000" })).status, 401);
  assert.equal((await t.call("/api/state", undefined, { "x-pin": "4821" })).status, 200);
  assert.equal((await t.call("/api/start", {})).status, 401);
  await t.close();
});

test("démarrer sans destination : message clair, pas de plantage", async () => {
  const t = await boot();
  const r = await t.call("/api/start", {});
  assert.equal(r.status, 400);
  assert.match(r.json.error, /destination/);
  assert.equal((await t.call("/api/nimporte", {})).status, 404);
  await t.close();
});

test("JSON invalide et corps trop grand sont refusés", async () => {
  const t = await boot();
  const res = await fetch(t.base + "/api/settings", { method: "POST", body: "{pas du json" });
  assert.equal(res.status, 400);
  const big = await fetch(t.base + "/api/settings", { method: "POST", body: "x".repeat(20_000) });
  assert.equal(big.status, 400);
  await t.close();
});

test("maskUrl cache le streamid", () => {
  assert.ok(!maskUrl("srtla://h:5000?streamid=abc").includes("abc"));
  assert.equal(maskUrl("pas une url"), "pas une url");
});

const ready = have("gst-launch-1.0", ["--version"]) && have("gst-inspect-1.0", ["x264enc"]) && have("gst-inspect-1.0", ["srtsink"]) && have("which", ["srt-live-transmit"]);

test("e2e : démarrer par l'API envoie un vrai flux, arrêter le coupe", { skip: !ready && "gstreamer, x264, srt ou srt-live-transmit absent" }, async () => {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const rx = spawn("srt-live-transmit", [`srt://127.0.0.1:${port}?mode=listener`, "file://con"], { stdio: ["ignore", "pipe", "ignore"] });
  let got = 0;
  rx.stdout.on("data", (b: Buffer) => { got += b.length; });
  await new Promise((r) => setTimeout(r, 500));
  const t = await boot(undefined, { url: `srt://127.0.0.1:${port}`, res: "720p30", bitrateKbps: 1500, latencyMs: 200 });
  assert.equal((await t.call("/api/start", {})).status, 200);
  assert.equal((await t.call("/api/start", {})).status, 400, "double démarrage refusé");
  await new Promise((r) => setTimeout(r, 4000));
  const live = await t.call("/api/state");
  assert.equal(live.json.state, "live");
  assert.ok(got > 20_000, `trop peu reçu : ${got}`);
  const off = await t.call("/api/stop", {});
  assert.equal(off.json.state, "idle");
  rx.kill();
  await t.close();
});
