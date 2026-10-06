import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// Réglages de la fenêtre SYXTEE Studio : nom du poste, compte, flux de destination, scène de direct, « Corriger », sauvegarde automatique.

const PORT = 47991;
process.env.SYXTEE_LINK_PORT = String(PORT);
process.env.SYXTEE_LINK_NO_OPEN = "1";
process.env.SYXTEE_LINK_HOME = mkdtempSync(join(tmpdir(), "slk-home-"));
const obsDir = mkdtempSync(join(tmpdir(), "slk-obs-"));
process.env.OBS_CONFIG_DIR = obsDir;
mkdirSync(join(obsDir, "basic", "scenes"), { recursive: true });
const IPC = "b".repeat(40);
process.env.SYXTEE_LINK_IPC = IPC;
const { startHelper } = await import("../src/helper.ts");
const { fixLiveScene, hasSource, SOURCE_NAME } = await import("../src/livescene.ts");
const { Agent } = await import("../src/agent.ts");

const call = (path: string, body?: unknown, token = IPC) =>
  fetch(`http://127.0.0.1:${PORT}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "x-syxtee": token, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test("API locale : jeton du plugin accepté, compte, flux (adresse de lecture jamais renvoyée), destination, nom du poste, sauvegarde auto", async () => {
  const seen: { method: string; path: string; body: string; auth: string }[] = [];
  const core = createServer(async (req, res) => {
    const parts: Buffer[] = [];
    for await (const c of req) parts.push(c as Buffer);
    seen.push({ method: String(req.method), path: String(req.url), body: Buffer.concat(parts).toString(), auth: String(req.headers.authorization) });
    const send = (code: number, v: unknown) => (res.writeHead(code, { "content-type": "application/json" }), res.end(JSON.stringify(v)));
    if (req.url === "/v1/link/me") return send(200, { email: "m@example.com", name: "Mathis D", avatar_url: "https://img.example/a.png", plan: "pro" });
    if (req.url === "/v1/link/streams") return send(200, { streams: [{ id: "r1", name: "Moblin", protocol: "srtla", live: false, obs_srt_url: "srt://x:1?streamid=SECRET" }] });
    if (req.url === "/v1/link/device" && req.method === "PATCH") return send(200, { ok: true });
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => core.listen(0, "127.0.0.1", r));
  writeFileSync(join(process.env.SYXTEE_LINK_HOME!, "config.json"), JSON.stringify({ core: `http://127.0.0.1:${(core.address() as AddressInfo).port}`, token: `slk_${"a".repeat(48)}` }));
  writeFileSync(join(obsDir, "basic", "scenes", "SYXTEE.json"), "{}");
  const h = startHelper({ openOnFirstRun: false });
  try {
    await new Promise((r) => setTimeout(r, 100));
    assert.equal((await call("/api/state", undefined, "c".repeat(40))).status, 403); // un autre jeton : refusé
    assert.equal((await call("/api/state")).status, 200);

    const me = await (await call("/api/account")).json();
    assert.deepEqual(me, { name: "Mathis D", email: "m@example.com", avatar_url: "https://img.example/a.png", device_name: "" });
    assert.equal(seen.find((x) => x.path === "/v1/link/me")?.auth, `Bearer slk_${"a".repeat(48)}`);

    const st = await (await call("/api/streams")).text();
    assert.ok(!st.includes("SECRET") && !st.includes("srt://"));
    assert.deepEqual(JSON.parse(st), { streams: [{ id: "r1", name: "Moblin", protocol: "srtla", live: false }], selected: "" });
    assert.equal((await call("/api/destination", { id: "inconnu" })).status, 400);
    assert.equal((await call("/api/destination", { id: "r1" })).status, 200);
    assert.equal((await (await call("/api/state")).json()).destination, "r1");

    assert.equal((await call("/api/rename", { name: "  " })).status, 400);
    assert.deepEqual(await (await call("/api/rename", { name: "Régie" })).json(), { ok: true, name: "Régie" });
    assert.equal(seen.find((s) => s.method === "PATCH")?.body, JSON.stringify({ name: "Régie" }));

    assert.equal((await call("/api/auto", { collection: "inconnue", enabled: true })).status, 400);
    assert.equal((await call("/api/auto", { collection: "SYXTEE", enabled: true })).status, 200);
    assert.deepEqual((await (await call("/api/state")).json()).autoBackup, { SYXTEE: true });
    await call("/api/auto", { collection: "SYXTEE", enabled: false });
    assert.deepEqual((await (await call("/api/state")).json()).autoBackup, {});
    // Scène de direct mémorisée ; OBS absent : le diagnostic le dit au lieu de planter.
    await call("/api/live-scene", { scene: "EN DIRECT" });
    const live = await (await call("/api/live")).json();
    assert.equal(live.scene, "EN DIRECT");
    assert.equal(live.obs, false);
  } finally {
    h.stop();
    core.close();
  }
});

/** Faux OBS : scènes et entrées en mémoire, journal des requêtes. */
function fakeObs(initial: { scenes: Record<string, string[]>; inputs?: string[] }) {
  const scenes = structuredClone(initial.scenes);
  const inputs = new Set(initial.inputs ?? []);
  const log: { type: string; data?: Record<string, unknown> }[] = [];
  const req = async (type: string, data?: Record<string, unknown>) => {
    log.push({ type, data });
    if (type === "GetSceneItemList") return { sceneItems: (scenes[String(data?.sceneName)] ?? []).map((sourceName) => ({ sourceName })) };
    if (type === "GetInputList") return { inputs: [...inputs].map((inputName) => ({ inputName })) };
    if (type === "CreateInput") {
      inputs.add(String(data?.inputName));
      scenes[String(data?.sceneName)].push(String(data?.inputName));
    }
    if (type === "CreateSceneItem") scenes[String(data?.sceneName)].push(String(data?.sourceName));
    return {};
  };
  return { req, log, scenes };
}

test("Corriger : ajoute « Flux SYXTEE » dans la scène de direct, réutilise ou met à jour la source existante", async () => {
  const url = "srt://relais.test:9000?streamid=play";
  const o = fakeObs({ scenes: { "EN DIRECT": ["Caméra"], DRONE: [] } });
  assert.equal(await hasSource(o.req, "EN DIRECT"), false);
  assert.equal(await hasSource(o.req, ""), false);
  assert.deepEqual(await fixLiveScene(o.req, "", url), { ok: false, message: "Choisis d'abord la scène de direct." });
  assert.deepEqual(await fixLiveScene(o.req, "EN DIRECT", ""), { ok: false, message: "Choisis d'abord un flux de destination." });
  assert.equal((await fixLiveScene(o.req, "EN DIRECT", url)).ok, true);
  const created = o.log.find((l) => l.type === "CreateInput")!;
  assert.equal(created.data?.inputKind, "ffmpeg_source");
  assert.equal(created.data?.inputName, SOURCE_NAME);
  assert.equal((created.data?.inputSettings as { input: string }).input, url);
  assert.equal((created.data?.inputSettings as { is_local_file: boolean }).is_local_file, false);
  assert.equal(await hasSource(o.req, "EN DIRECT"), true);

  // Déjà présente : adresse remise à jour, rien n'est créé.
  const before = o.log.filter((l) => l.type === "CreateInput").length;
  assert.equal((await fixLiveScene(o.req, "EN DIRECT", url + "2")).ok, true);
  assert.equal(o.log.filter((l) => l.type === "CreateInput").length, before);
  assert.equal(o.log.at(-1)?.type, "SetInputSettings");

  // Source existante dans une autre scène : rattachée à celle-ci, pas dupliquée.
  assert.equal((await fixLiveScene(o.req, "DRONE", url)).ok, true);
  assert.ok(o.log.some((l) => l.type === "CreateSceneItem" && l.data?.sceneName === "DRONE"));
  assert.equal(o.log.filter((l) => l.type === "CreateInput").length, before);
});

test("sauvegarde automatique : seulement si modifiée depuis la dernière sauvegarde, stable depuis 1 min, pas de boucle sur échec", async () => {
  const file = join(obsDir, "basic", "scenes", "AUTO.json");
  writeFileSync(file, "{}");
  const cfg = { autoBackup: { AUTO: true }, lastBackup: {} as Record<string, string> };
  const runs: string[] = [];
  const record = (n: string) => void runs.push(n);
  const fake = { stopped: false, status: { core: "on", job: null as null | { state: string } }, cfg, autoFailedAt: new Map(), log: () => {}, runBackup: async (n: string): Promise<boolean> => (record(n), true) };
  const tick = () => (Agent.prototype as unknown as { autoBackupTick: (this: unknown) => Promise<void> }).autoBackupTick.call(fake);
  const age = (s: number) => utimesSync(file, new Date(Date.now() - s * 1000), new Date(Date.now() - s * 1000));

  age(5);
  await tick();
  assert.deepEqual(runs, []); // OBS vient d'écrire : on attend
  age(120);
  await tick();
  assert.deepEqual(runs, ["AUTO"]);
  cfg.lastBackup.AUTO = new Date().toISOString();
  await tick();
  assert.deepEqual(runs, ["AUTO"]); // rien de neuf depuis la sauvegarde
  cfg.lastBackup.AUTO = new Date(Date.now() - 600_000).toISOString();
  age(100);
  fake.runBackup = async (n: string): Promise<boolean> => (record(n), false);
  await tick();
  await tick();
  assert.deepEqual(runs, ["AUTO", "AUTO"]); // échec : pas retenté avant 10 min
  fake.status.core = "off";
  fake.autoFailedAt.clear();
  await tick();
  assert.equal(runs.length, 2); // pas connecté : rien
});
