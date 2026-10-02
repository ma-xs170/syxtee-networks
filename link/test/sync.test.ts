import assert from "node:assert/strict";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { listCollections, readObsWebsocket } from "../src/obsconfig.ts";
import { createArchive, plan, restoreArchive } from "../src/scenesync.ts";
import { tarStream, untar } from "../src/tar.ts";

const tmp = () => mkdtempSync(join(tmpdir(), "slk-"));
const ID = "11111111-1111-4111-8111-111111111111";

function fakeObs() {
  const root = tmp();
  const media = tmp();
  process.env.OBS_CONFIG_DIR = root;
  process.env.SYXTEE_LINK_MEDIA = join(tmp(), "Médias");
  mkdirSync(join(root, "basic", "scenes"), { recursive: true });
  const intro = join(media, "intro vidéo.mp4");
  const logo = join(media, "logo.png");
  const script = join(media, "overlay.lua");
  writeFileSync(intro, Buffer.alloc(1_500_000, 7)); // dépasse plusieurs blocs tar
  writeFileSync(logo, Buffer.from("PNGDATA"));
  writeFileSync(script, "print('x')");
  const json = {
    name: "SYXTEE",
    current_scene: "Live",
    sources: [
      { id: "ffmpeg_source", name: "Intro", settings: { local_file: intro, looping: false } },
      { id: "image_source", name: "Logo", settings: { file: logo } },
      { id: "image_source", name: "Logo bis", settings: { file: logo } }, // même fichier, une seule copie
      { id: "image_source", name: "Absent", settings: { file: join(media, "absent.png") } },
      { id: "scene", name: "Live", settings: { items: [] } },
    ],
    modules: { "scripts-tool": [{ path: script }] },
  };
  writeFileSync(join(root, "basic", "scenes", "SYXTEE.json"), JSON.stringify(json));
  writeFileSync(join(root, "basic", "scenes", "SYXTEE.json.bak"), "{}");
  return { root, intro, logo, script };
}

test("collections : .json seulement, triées", () => {
  const { root } = fakeObs();
  writeFileSync(join(root, "basic", "scenes", "Autre.json"), "{}");
  assert.deepEqual(listCollections(), ["Autre", "SYXTEE"]);
});

test("plan : médias existants, sans doublon, sans script, sans fichier absent", async () => {
  const { intro, logo } = fakeObs();
  const p = await plan("SYXTEE");
  assert.deepEqual(p.media.map((m) => m.path).sort(), [intro, logo].sort());
  assert.equal(p.bytes, 1_500_000 + 7);
  await assert.rejects(plan("../etc/passwd"), /invalide/);
  await assert.rejects(plan("Inconnue"), /introuvable/);
});

test("archive puis restauration : médias copiés, chemins réécrits, collection existante intacte", async () => {
  const { root, intro } = fakeObs();
  const out = join(tmp(), "a.tgz");
  const r = await createArchive("SYXTEE", out, { obs: "32.2.2", host: "Mac" });
  assert.equal(r.media, 2);
  assert.ok(r.size > 0 && r.size < 200_000); // 1,5 Mo répétitif se compresse
  const before = readFileSync(join(root, "basic", "scenes", "SYXTEE.json"), "utf8");

  const res = await restoreArchive(createReadStream(out), ID);
  assert.equal(res.collection, "SYXTEE (SYXTEE)");
  assert.equal(res.media, 2);
  const restored = JSON.parse(readFileSync(join(root, "basic", "scenes", "SYXTEE (SYXTEE).json"), "utf8"));
  assert.equal(restored.name, "SYXTEE (SYXTEE)");
  const intro2 = restored.sources[0].settings.local_file as string;
  assert.ok(intro2.startsWith(join(process.env.SYXTEE_LINK_MEDIA!, ID)) && intro2 !== intro);
  assert.equal(readFileSync(intro2).length, 1_500_000);
  assert.equal(readFileSync(restored.sources[1].settings.file, "utf8"), "PNGDATA");
  assert.equal(restored.sources[1].settings.file, restored.sources[2].settings.file);
  assert.ok(restored.sources[3].settings.file.endsWith("absent.png")); // inchangé
  assert.equal(readFileSync(join(root, "basic", "scenes", "SYXTEE.json"), "utf8"), before);

  // Deuxième restauration : nouveau nom, aucune écrasée.
  const res2 = await restoreArchive(createReadStream(out), ID);
  assert.equal(res2.collection, "SYXTEE (SYXTEE) 2");
});

test("tar : noms dangereux ignorés, archive tronquée ou piégée refusée", async () => {
  const dir = tmp();
  const evil = tarStream([
    { name: "../../evil.txt", data: Buffer.from("x"), size: 1 },
    { name: "/etc/passwd", data: Buffer.from("x"), size: 1 },
    { name: "media/ok.bin", data: Buffer.from("abc"), size: 3 },
    { name: "media/../up.bin", data: Buffer.from("x"), size: 1 },
  ]);
  const got: string[] = [];
  await untar(evil, async (name, _s, c) => {
    got.push(name);
    for await (const _ of c) void _;
  });
  assert.deepEqual(got, ["media/ok.bin"]);
  assert.equal(existsSyncSafe(join(dir, "evil.txt")), false);

  // Tronquée : un en-tête annonce 1000 octets, le flux s'arrête.
  const full = await collect(tarStream([{ name: "media/x.bin", data: Buffer.alloc(1000, 1), size: 1000 }]));
  await assert.rejects(untar(Readable.from([full.subarray(0, 700)]), async (_n, _s, c) => void (await drain(c))), /tronquée/);
  // Taille cumulée trop grande.
  await assert.rejects(untar(Readable.from([full]), async (_n, _s, c) => void (await drain(c)), 500), /trop grande/);
});

test("restauration : archive sans manifeste refusée, identifiant invalide refusé", async () => {
  fakeObs();
  const bad = gzipSync(await collect(tarStream([{ name: "media/a.bin", data: Buffer.from("a"), size: 1 }])));
  await assert.rejects(restoreArchive(Readable.from([bad]), ID), /incomplète/);
  await assert.rejects(restoreArchive(Readable.from([bad]), "../../x"), /invalide/);
});

test("réglages WebSocket d'OBS lus depuis plugin_config", () => {
  const { root } = fakeObs();
  assert.equal(readObsWebsocket(), null);
  mkdirSync(join(root, "plugin_config", "obs-websocket"), { recursive: true });
  writeFileSync(join(root, "plugin_config", "obs-websocket", "config.json"), JSON.stringify({ server_enabled: true, server_port: 4466, server_password: "pw", auth_required: true }));
  assert.deepEqual(readObsWebsocket(), { enabled: true, port: 4466, password: "pw", authRequired: true });
});

const existsSyncSafe = (p: string) => existsSync(p);
async function collect(r: Readable) {
  const parts: Buffer[] = [];
  for await (const c of r) parts.push(c as Buffer);
  return Buffer.concat(parts);
}
async function drain(r: Readable) {
  for await (const _ of r) void _;
}
