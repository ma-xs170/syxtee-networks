import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createBackups } from "../../core/src/backups.ts";
import { loadConfig } from "../../core/src/config.ts";
import { createRemote } from "../../core/src/remote.ts";
import { buildServer, type Deps } from "../../core/src/server.ts";
import { fakeDb } from "../../core/test/fake-db.ts";

// Sauvegarde légère de bout en bout : le VRAI agent (backup2.ts) contre les VRAIES routes du Core (buildServer + createBackups).

const U = "00000000-0000-4000-8000-000000000001";
process.env.SYXTEE_LINK_HOME = mkdtempSync(join(tmpdir(), "slk-home-"));
const obs = mkdtempSync(join(tmpdir(), "slk-obs-"));
process.env.OBS_CONFIG_DIR = obs;
process.env.SYXTEE_LINK_MEDIA = join(mkdtempSync(join(tmpdir(), "slk-med-")), "Médias");
const { backupV2, restoreV2, skipFile, LegacyCore } = await import("../src/backup2.ts");

async function stack() {
  const dataDir = mkdtempSync(join(tmpdir(), "core-data-"));
  const config = loadConfig({ CORE_API_TOKEN: "t".repeat(40), SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_x", SLS_API_KEY: "slskey123", RELAY_KEYS_SECRET: "k".repeat(64), RELAY_PUBLIC_HOST: "relais.test", DATA_DIR: dataDir });
  const db = fakeDb(
    { link_devices: ["token_hash", "refresh_hash"] },
    { link_devices: () => ({ id: crypto.randomUUID(), created_at: "", last_seen: null }), link_backups: () => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), format: 1, new_bytes: 0 }) },
  );
  const remote = createRemote({ db: db as never, canUse: (id) => id === U, verifyUser: async () => U, log: () => {} });
  const backups = createBackups({ db: db as never, dir: join(dataDir, "link-backups") });
  const app = buildServer({
    config, relays: {}, health: { state: () => null, relay: () => null, liveRelays: () => [], byUser: () => [], events: { on() {}, off() {} } }, rtmp: {}, samples: { history: () => [] }, sessions: { current: () => null },
    verifyUser: async () => U, previewPath: () => "", onKeysChanged: () => {}, slsHealthy: async () => true, remote, backups,
  } as unknown as Deps);
  await app.listen({ port: 0, host: "127.0.0.1" });
  const claim = await remote.claim("1.1.1.1", remote.newCode(U).code, "Mac", "darwin");
  assert.ok("token" in claim);
  return { app, backups, core: `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`, token: "token" in claim ? claim.token : "" };
}

function makeCollection(name: string, media: Record<string, Buffer>) {
  const dir = mkdtempSync(join(tmpdir(), "slk-media-"));
  const sources: { settings: { file: string } }[] = [];
  for (const [rel, data] of Object.entries(media)) {
    const full = join(dir, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, data);
    sources.push({ settings: { file: full } });
  }
  mkdirSync(join(obs, "basic", "scenes"), { recursive: true });
  const file = join(obs, "basic", "scenes", `${name}.json`);
  writeFileSync(file, JSON.stringify({ name, sources }, null, 2));
  return { dir, file };
}

test("exclusions : caches, miniatures, fichiers temporaires", () => {
  for (const p of ["/a/cache/x.png", "/a/.cache/x.png", "/a/Thumbnails/y.jpg", "/a/tmp/z.mp4", "/a/video.mp4.part", "/a/.DS_Store", "/a/Thumbs.db", "/a/x.tmp", "C:\\a\\Temp\\x.png"]) assert.ok(skipFile(p), p);
  for (const p of ["/a/logo.png", "/a/fond.mp4", "/a/cachet.png", "/a/music.mp3"]) assert.ok(!skipFile(p), p);
});

test("deux sauvegardes de la même collection : la 2e envoie 0 octet de média et ajoute moins de 100 Ko ; un fichier modifié : seul lui part", async () => {
  const s = await stack();
  try {
    const logo = randomBytes(300_000);
    const fond = randomBytes(700_000);
    const texte = Buffer.from(JSON.stringify({ phrases: "x".repeat(80_000) }));
    const c = makeCollection("SYXTEE", { "logo.png": logo, "fond.mp4": fond, "titres.json": texte, "cache/miniature.png": randomBytes(50_000), "scripts/outil.lua": Buffer.from("print(1)") });
    const run = () => backupV2({ core: s.core, token: async () => s.token, collection: "SYXTEE", obs: "32.2.2", host: "Mac" });

    const r1 = await run();
    assert.equal(r1.files, 3, "cache et script exclus");
    assert.equal(r1.version, 1);
    assert.ok(r1.uploaded > 1_000_000);
    const u1 = (await s.backups.usage(U)).used;
    assert.ok(u1 < logo.length + fond.length + 100_000, `texte compressé : ${u1}`); // le JSON de 80 Ko part compressé

    const r2 = await run();
    assert.equal(r2.version, 2);
    assert.ok(r2.uploaded === 0, `2e sauvegarde : ${r2.uploaded} octets envoyés`);
    assert.equal(r2.new_bytes, 0);
    assert.ok((await s.backups.usage(U)).used - u1 < 100 * 1024);

    // Un seul média change : seul lui est envoyé
    writeFileSync(join(c.dir, "logo.png"), randomBytes(300_000));
    const r3 = await run();
    assert.equal(r3.version, 3);
    assert.ok(r3.uploaded >= 300_000 && r3.uploaded < 310_000, `envoyé ${r3.uploaded}`);
    assert.ok((await s.backups.usage(U)).used - u1 < 310_000);
    assert.equal((await s.backups.list(U)).length, 3);
  } finally {
    await s.app.close();
  }
});

test("import : médias téléchargés une fois et partagés, collection ajoutée sans toucher à l'existante, vérifié à l'octet", async () => {
  const s = await stack();
  try {
    const logo = randomBytes(120_000);
    const c = makeCollection("RESTAURE", { "logo.png": logo, "sous-dossier/fond.mp4": randomBytes(200_000) });
    const original = readFileSync(c.file, "utf8");
    const r = await backupV2({ core: s.core, token: async () => s.token, collection: "RESTAURE", obs: "32.2.2", host: "Mac" });
    const imported = await restoreV2({ core: s.core, token: async () => s.token, id: r.id });
    assert.deepEqual(imported, { collection: "RESTAURE (SYXTEE)", media: 2 });
    // La collection ouverte n'a pas bougé
    assert.equal(readFileSync(c.file, "utf8"), original);
    // La nouvelle collection pointe vers des médias locaux identiques
    const added = JSON.parse(readFileSync(join(obs, "basic", "scenes", "RESTAURE (SYXTEE).json"), "utf8")) as { name: string; sources: { settings: { file: string } }[] };
    assert.equal(added.name, "RESTAURE (SYXTEE)");
    assert.ok(added.sources[0].settings.file.startsWith(join(process.env.SYXTEE_LINK_MEDIA!, "blobs")));
    assert.ok(readFileSync(added.sources[0].settings.file).equals(logo));
    // Un 2e import ne retélécharge rien et ne remplace pas la collection précédente
    const again = await restoreV2({ core: s.core, token: async () => s.token, id: r.id });
    assert.equal(again?.collection, "RESTAURE (SYXTEE) 2");
    // Version inconnue / ancien format : pas de plantage, l'appelant bascule sur l'archive
    assert.equal(await restoreV2({ core: s.core, token: async () => s.token, id: "00000000-0000-4000-8000-0000000000ee" }), null);
  } finally {
    await s.app.close();
  }
});

test("Core sans le format léger : l'agent le sait (retombe sur l'archive .tgz)", async () => {
  const http = await import("node:http");
  const old = http.createServer((_req, res) => res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ message: "Route POST:/v1/link/backups/begin not found" })));
  await new Promise<void>((r) => old.listen(0, "127.0.0.1", r));
  makeCollection("ANCIEN", { "a.png": randomBytes(1000) });
  try {
    await assert.rejects(backupV2({ core: `http://127.0.0.1:${(old.address() as AddressInfo).port}`, token: async () => "slk_x", collection: "ANCIEN", obs: "", host: "" }), (e) => e instanceof LegacyCore);
  } finally {
    old.close();
  }
});
