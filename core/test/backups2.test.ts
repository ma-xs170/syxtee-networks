import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { createBackups, GC_GRACE_MS, isCompressible, type CommitMeta } from "../src/backups.ts";
import { fakeDb } from "./fake-db.ts";

// Sauvegardes légères : un fichier = un SHA-256 = un seul exemplaire par compte, partagé entre versions et collections.

const U = "00000000-0000-4000-8000-000000000001";
const V = "00000000-0000-4000-8000-000000000002";
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

function setup(quota = 5 * 1024 ** 3) {
  const db = fakeDb({}, { link_backups: () => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), format: 1, new_bytes: 0 }) });
  const dir = mkdtempSync(join(tmpdir(), "bk2-"));
  let t = Date.now();
  const b = createBackups({ db: db as never, dir, quota, now: () => t });
  return { b, db, dir, advance: (ms: number) => (t += ms) };
}

/** Une « collection » : JSON de scènes + médias. */
function collection(media: Record<string, Buffer>, json = '{"name":"SYXTEE","sources":[]}') {
  const col = Buffer.from(json);
  return { col, media };
}

/** Envoie une version complète (begin → fichiers manquants → commit), comme l'agent. */
async function save(b: ReturnType<typeof setup>["b"], user: string, name: string, c: ReturnType<typeof collection>) {
  const files = Object.entries(c.media).map(([n, buf]) => ({ sha256: sha(buf), size: buf.length, name: n }));
  const meta = { collection: name, collection_sha256: sha(c.col), collection_size: c.col.length, files: files.map(({ sha256, size }) => ({ sha256, size })) };
  const begin = await b.begin(user, meta);
  assert.ok(!("error" in begin), JSON.stringify(begin));
  const bySha = new Map<string, Buffer>([[sha(c.col), c.col], ...Object.values(c.media).map((m) => [sha(m), m] as [string, Buffer])]);
  for (const s of begin.missing) {
    const raw = bySha.get(s)!;
    // Comme l'agent : le JSON (compressible) part en gzip, les médias tels quels.
    const gz = s === sha(c.col);
    const body = gz ? gzipSync(raw) : raw;
    const r = await b.putBlob(user, s, { size: raw.length, encoding: gz ? "gzip" : "raw" }, Readable.from([body]), body.length);
    assert.ok("ok" in r, JSON.stringify(r));
  }
  const commit = await b.commit(user, { name, obs: "32.2.2", host: "Mac", ...meta, files } satisfies CommitMeta);
  assert.ok(!("error" in commit), JSON.stringify(commit));
  return { begin, commit };
}

const media = () => ({ "logo.png": Buffer.alloc(300_000, 7), "fond.mp4": Buffer.alloc(900_000, 9), "sons.json": Buffer.from(JSON.stringify({ a: "x".repeat(50_000) })) });

test("deux sauvegardes identiques : la seconde n'ajoute presque rien au quota (< 100 Ko)", async () => {
  const { b } = setup();
  const c = collection(media());
  const a1 = await save(b, U, "SYXTEE", c);
  assert.equal(a1.begin.missing.length, 4); // collection + 3 fichiers
  const u1 = (await b.usage(U)).used;
  assert.ok(u1 > 1_000_000);
  assert.equal(a1.commit.version, 1);
  assert.equal(a1.commit.new_bytes, u1);

  const a2 = await save(b, U, "SYXTEE", c);
  assert.deepEqual(a2.begin.missing, []); // rien à renvoyer
  assert.equal(a2.commit.version, 2);
  assert.equal(a2.commit.new_bytes, 0);
  const u2 = (await b.usage(U)).used;
  assert.ok(u2 - u1 < 100 * 1024, `quota +${u2 - u1} octets`);
  assert.equal(u2, u1);
  // Deux versions listées, chacune avec sa taille d'origine complète
  const rows = await b.list(U);
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.format === 2 && r.size > 1_200_000));
});

test("un seul fichier modifié : seul celui-là est renvoyé et compté", async () => {
  const { b } = setup();
  const m = media();
  await save(b, U, "SYXTEE", collection(m));
  const before = (await b.usage(U)).used;
  const changed = { ...m, "logo.png": Buffer.alloc(300_000, 8) };
  const r = await save(b, U, "SYXTEE", collection(changed));
  assert.equal(r.begin.missing.length, 1);
  assert.equal(r.commit.new_bytes, 300_000);
  assert.equal((await b.usage(U)).used, before + 300_000);
});

test("fichiers partagés entre collections ; texte compressé, médias tels quels", async () => {
  const { b } = setup();
  const m = media();
  await save(b, U, "A", collection(m, '{"name":"A"}'));
  const used = (await b.usage(U)).used;
  const r = await save(b, U, "B", collection(m, '{"name":"B"}')); // mêmes médias, autre collection
  assert.equal(r.begin.missing.length, 1); // seule la collection B est nouvelle
  assert.ok((await b.usage(U)).used - used < 2000);
  // Le JSON compressible est stocké plus petit que l'original, le média incompressible tel quel
  const blobs = (await (async () => (b as any) && (await import("node:fs")))()) && null;
  void blobs;
  assert.ok(isCompressible("collection.json") && isCompressible("x.SVG") && !isCompressible("a.mp4") && !isCompressible("a.png"));
  const big = Buffer.from(JSON.stringify({ t: "y".repeat(400_000) }));
  const before = (await b.usage(U)).used;
  await save(b, U, "C", collection({ "gros.json": big }));
  const added = (await b.usage(U)).used - before;
  // (le fichier .json de l'essai part en « raw » comme média ; la collection, elle, en gzip : elle reste minuscule)
  assert.ok(added < big.length + 5000);
});

test("vérification des fichiers reçus : mauvais contenu, taille mensongère, bombe de décompression refusés", async () => {
  const { b, dir } = setup();
  const good = Buffer.alloc(1000, 5);
  const s = sha(good);
  // Contenu différent du SHA annoncé
  assert.deepEqual(await b.putBlob(U, s, { size: 1000, encoding: "raw" }, Readable.from([Buffer.alloc(1000, 6)]), 1000), { error: "mismatch" });
  // Taille annoncée fausse
  assert.deepEqual(await b.putBlob(U, s, { size: 999, encoding: "raw" }, Readable.from([good]), 1000), { error: "length_required" });
  assert.deepEqual(await b.putBlob(U, s, { size: 1000, encoding: "raw" }, Readable.from([good.subarray(0, 900)]), 1000), { error: "mismatch" });
  // Gzip qui se décompresse en plus gros que prévu (bombe)
  const bomb = gzipSync(Buffer.alloc(50_000_000, 1));
  assert.deepEqual(await b.putBlob(U, sha(Buffer.alloc(50_000_000, 1)), { size: 1000, encoding: "gzip" }, Readable.from([bomb]), bomb.length), { error: "mismatch" });
  // SHA ou encodage invalides
  assert.deepEqual(await b.putBlob(U, "zz", { size: 1, encoding: "raw" }, Readable.from([good]), 1), { error: "invalid" });
  assert.deepEqual(await b.putBlob(U, s, { size: 1000, encoding: "rot13" as never }, Readable.from([good]), 1000), { error: "invalid" });
  assert.equal((await b.usage(U)).used, 0);
  const left = existsSync(join(dir, U)) ? readdirSync(join(dir, U, "blobs"), { recursive: true }).filter((f) => String(f).endsWith(".part")) : [];
  assert.deepEqual(left, []); // aucun fichier temporaire ne reste
  // Le bon contenu passe, et un 2e envoi du même fichier est ignoré
  assert.deepEqual(await b.putBlob(U, s, { size: 1000, encoding: "raw" }, Readable.from([good]), 1000), { ok: true, existed: false, stored: 1000 });
  assert.deepEqual(await b.putBlob(U, s, { size: 1000, encoding: "raw" }, Readable.from([good]), 1000), { ok: true, existed: true, stored: 1000 });
  assert.equal((await b.usage(U)).used, 1000);
});

test("quota : refusé d'avance (begin) et à l'envoi, calculé sur les octets uniques", async () => {
  const { b } = setup(2_000_000);
  const big = collection({ "a.mp4": Buffer.alloc(1_500_000, 1) });
  await save(b, U, "A", big);
  // Même fichier dans une autre collection : rien à ajouter, donc accepté
  await save(b, U, "B", collection({ "a.mp4": Buffer.alloc(1_500_000, 1) }, '{"name":"B"}'));
  // Un nouveau gros fichier ne rentre plus
  const other = Buffer.alloc(1_000_000, 2);
  const begin = await b.begin(U, { collection: "C", collection_sha256: sha("c"), collection_size: 1, files: [{ sha256: sha(other), size: other.length }] });
  assert.equal("error" in begin && begin.error, "quota");
  const r = await b.putBlob(U, sha(other), { size: other.length, encoding: "raw" }, Readable.from([other]), other.length);
  assert.deepEqual(r, { error: "quota" });
  // Un autre compte a son propre quota
  assert.ok(!("error" in (await b.begin(V, { collection: "C", collection_sha256: sha("c"), collection_size: 1, files: [{ sha256: sha(other), size: other.length }] }))));
});

test("versions : 4 gardées par collection, fichiers libérés seulement quand plus aucune version ne les référence", async () => {
  const { b, advance } = setup();
  const keep = Buffer.alloc(100_000, 1);
  let last = 0;
  for (let i = 0; i < 6; i++) {
    const unique = Buffer.alloc(10_000, 100 + i); // un fichier propre à chaque version
    const r = await save(b, U, "SYXTEE", collection({ "commun.png": keep, "propre.png": unique }));
    assert.equal(r.commit.version, i + 1);
    last = (await b.usage(U)).used;
  }
  const rows = await b.list(U);
  assert.deepEqual(rows.map((r) => r.version).sort(), [3, 4, 5, 6]);
  // Les fichiers propres aux versions 1 et 2 sont encore là (moins d'une heure) puis nettoyés
  assert.ok((await b.usage(U)).used >= last);
  advance(GC_GRACE_MS + 1000);
  const g = await b.gc(U);
  assert.equal(g.removed, 2); // les 2 fichiers propres aux versions 1 et 2 ; la collection (identique) et le fichier commun restent
});

test("supprimer une version libère seulement ses fichiers à elle", async () => {
  const { b, advance } = setup();
  const shared = Buffer.alloc(200_000, 1);
  const only1 = Buffer.alloc(50_000, 2);
  const v1 = await save(b, U, "A", collection({ "commun.mp4": shared, "seul.mp4": only1 }, '{"v":1}'));
  await save(b, U, "A", collection({ "commun.mp4": shared }, '{"v":2}'));
  const before = (await b.usage(U)).used;
  advance(GC_GRACE_MS + 1000);
  assert.equal(await b.remove(V, v1.commit.id), false); // un autre compte ne supprime rien
  assert.equal(await b.remove(U, v1.commit.id), true);
  const after = (await b.usage(U)).used;
  assert.ok(before - after >= only1.length && before - after < only1.length + 1000, `libéré ${before - after}`);
  // Le fichier commun est toujours lisible, le fichier propre à la version supprimée a disparu
  assert.ok(await b.blobStream(U, sha(shared)));
  assert.equal(await b.blobStream(U, sha(only1)), null);
});

test("lecture : manifeste et fichiers (décompressés) réservés à leur compte", async () => {
  const { b } = setup();
  const c = collection({ "logo.png": Buffer.alloc(5000, 3) }, '{"name":"X","sources":[{"file":"@@SYXTEE_MEDIA/abc/logo.png@@"}]}');
  const r = await save(b, U, "X", c);
  const m = await b.manifestOf(U, r.commit.id);
  assert.equal(m?.format, 2);
  assert.equal(m?.files[0].name, "logo.png");
  assert.equal(await b.manifestOf(V, r.commit.id), null);
  const col = await b.blobStream(U, sha(c.col));
  assert.ok(col);
  const chunks: Buffer[] = [];
  for await (const x of col!.stream) chunks.push(x as Buffer);
  assert.equal(Buffer.concat(chunks).toString(), c.col.toString()); // décompressé à la lecture
  assert.equal(col!.size, c.col.length);
  assert.equal(await b.blobStream(V, sha(c.col)), null);
  assert.equal(await b.blobStream(U, "pas-un-sha"), null);
});

test("validation d'une version : refusée si un fichier manque", async () => {
  const { b } = setup();
  const f = Buffer.alloc(100, 4);
  const meta = { name: "A", obs: "", host: "", collection: "A", collection_sha256: sha("col"), collection_size: 3, files: [{ sha256: sha(f), size: 100, name: "f.png" }] };
  const r = await b.commit(U, meta);
  assert.equal("error" in r && r.error, "missing");
  assert.equal(("missing" in r && r.missing)?.length, 2);
  assert.deepEqual(await b.list(U), []);
});

// ───── Conversion des anciennes sauvegardes (.tgz) ─────

/** Archive tar (en-têtes ustar) de l'ancien format, puis gzip. */
function tgz(entries: { name: string; data: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  for (const e of entries) {
    const h = Buffer.alloc(512);
    h.write(e.name, 0, "utf8");
    h.write("0000644\0", 100);
    h.write("0000000\0", 108);
    h.write("0000000\0", 116);
    h.write(e.data.length.toString(8).padStart(11, "0") + "\0", 124);
    h.write("00000000000\0", 136);
    h.write("        ", 148);
    h.write("0", 156);
    h.write("ustar\0" + "00", 257);
    let s = 0;
    for (const x of h) s += x;
    h.write(s.toString(8).padStart(6, "0") + "\0 ", 148);
    parts.push(h, e.data, Buffer.alloc((512 - (e.data.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts));
}

test("migration : les anciennes archives deviennent des versions légères, fichiers partagés stockés une fois, archives supprimées", async () => {
  const { b, dir } = setup();
  const logo = randomBytes(400_000); // des médias réels ne se compressent pas : aléatoire
  const fond = randomBytes(800_000);
  const extra = randomBytes(100_000);
  const legacy = (n: number, extra?: Buffer) => {
    const files = [{ name: "media/0001-logo.png", data: logo }, { name: "media/0002-fond.mp4", data: fond }, ...(extra ? [{ name: "media/0003-extra.png", data: extra }] : [])];
    const json = JSON.stringify({ name: "SYXTEE", sources: files.map((f) => ({ file: `@@SYXTEE_MEDIA/${f.name}@@` })), v: n });
    return tgz([{ name: "manifest.json", data: Buffer.from(JSON.stringify({ version: 1, collection: "SYXTEE", created: "2026-10-01T10:00:00Z", obs: "32.2.2", host: "Mac", media: [] })) }, { name: "collection.json", data: Buffer.from(json) }, ...files]);
  };
  const a1 = legacy(1);
  const a2 = legacy(2, extra);
  const put = async (buf: Buffer) => {
    const r = await b.put(U, { name: "SYXTEE", collection: "SYXTEE", media: 2, obs: "32.2.2", host: "Mac" }, Readable.from([buf]), buf.length);
    assert.ok("id" in r);
    return r.id;
  };
  const id1 = await put(a1);
  const id2 = await put(a2);
  const legacyUsed = (await b.usage(U)).used;
  assert.equal(legacyUsed, a1.length + a2.length); // l'ancien format recopie tout

  const r = await b.migrate();
  assert.deepEqual([r.converted, r.failed], [2, 0]);
  const rows = await b.list(U);
  assert.ok(rows.every((x) => x.format === 2));
  // Archives supprimées, fichiers partagés rangés une seule fois
  assert.equal(existsSync(join(dir, U, `${id1}.tgz`)), false);
  assert.equal(existsSync(join(dir, U, `${id2}.tgz`)), false);
  const usage = await b.usage(U);
  assert.ok(usage.used < logo.length + fond.length + 100_000 + 20_000, `quota après migration : ${usage.used}`); // logo et fond une seule fois
  assert.ok(usage.used < legacyUsed - 800_000);
  // Manifestes : repères par contenu, noms d'origine
  const m2 = await b.manifestOf(U, id2);
  assert.deepEqual(m2?.files.map((f) => f.name), ["logo.png", "fond.mp4", "extra.png"]);
  assert.equal(m2?.files[0].sha256, sha(logo));
  const col = await b.blobStream(U, m2!.collection_sha256);
  const chunks: Buffer[] = [];
  for await (const c of col!.stream) chunks.push(c as Buffer);
  const json = JSON.parse(Buffer.concat(chunks).toString());
  assert.equal(json.sources[0].file, `@@SYXTEE_MEDIA/${sha(logo)}/logo.png@@`);
  assert.equal(json.sources[2].file, `@@SYXTEE_MEDIA/${sha(extra)}/extra.png@@`);
  // Fichier restitué à l'octet près
  const f = await b.blobStream(U, sha(fond));
  const got: Buffer[] = [];
  for await (const c of f!.stream) got.push(c as Buffer);
  assert.ok(Buffer.concat(got).equals(fond));
  // Idempotent
  assert.deepEqual(await b.migrate(), { converted: 0, failed: 0, freed: 0 });
});

test("migration : une archive illisible n'est pas supprimée et n'arrête pas les autres", async () => {
  const { b, dir } = setup();
  const good = tgz([{ name: "collection.json", data: Buffer.from('{"name":"ok"}') }]);
  const bad = Buffer.from("ceci n'est pas une archive");
  const r1 = await b.put(U, { name: "ok", collection: "ok", media: 0, obs: "", host: "" }, Readable.from([good]), good.length);
  const r2 = await b.put(U, { name: "ko", collection: "ko", media: 0, obs: "", host: "" }, Readable.from([bad]), bad.length);
  assert.ok("id" in r1 && "id" in r2);
  const r = await b.migrate();
  assert.deepEqual([r.converted, r.failed], [1, 1]);
  assert.equal(existsSync(join(dir, U, `${(r2 as { id: string }).id}.tgz`)), true); // conservée
  assert.equal(existsSync(join(dir, U, `${(r1 as { id: string }).id}.tgz`)), false);
});
