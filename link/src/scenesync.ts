import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, isAbsolute, join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";
import { scenesDir } from "./obsconfig.ts";
import { fileSize, tarStream, untar, writeInto, type TarFile } from "./tar.ts";

// Sauvegarde d'une collection de scènes OBS avec ses médias, et restauration sur un autre poste (ou le même).
// L'archive contient : manifest.json, collection.json (chemins des médias remplacés par des repères) et media/<n>-<nom>.
// Les scripts (.lua, .py) sont volontairement exclus : ils s'exécutent dans OBS.

const MARK = (name: string) => `@@SYXTEE_MEDIA/${name}@@`;
const MARK_RE = /^@@SYXTEE_MEDIA\/(media\/[A-Za-z0-9._-]{1,90})@@$/;
const SKIP_EXT = new Set([".lua", ".py", ".exe", ".dll", ".dylib", ".app", ".sh", ".bat", ".cmd", ".command"]);

export type Manifest = { version: 1; collection: string; created: string; obs: string; host: string; media: { name: string; original: string; size: number }[] };
export type Plan = { collection: string; media: { path: string; size: number }[]; bytes: number };

/** Parcourt toutes les valeurs texte d'un objet JSON. */
function* strings(v: unknown): Generator<string> {
  if (typeof v === "string") yield v;
  else if (Array.isArray(v)) for (const x of v) yield* strings(x);
  else if (v && typeof v === "object") for (const x of Object.values(v)) yield* strings(x);
}

function replaceStrings(v: unknown, map: (s: string) => string): unknown {
  if (typeof v === "string") return map(v);
  if (Array.isArray(v)) return v.map((x) => replaceStrings(x, map));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replaceStrings(x, map)]));
  return v;
}

const sceneFile = (collection: string) => join(scenesDir(), `${collection}.json`);

/** Médias d'une collection : toute valeur qui est le chemin absolu d'un fichier existant (hors scripts). */
export async function plan(collection: string): Promise<Plan & { json: unknown }> {
  if (!/^[^/\\\0]{1,120}$/.test(collection)) throw new Error("Nom de collection invalide.");
  const raw = await readFile(sceneFile(collection), "utf8").catch(() => null);
  if (raw === null) throw new Error(`Collection introuvable : ${collection}`);
  const json = JSON.parse(raw) as unknown;
  const seen = new Set<string>();
  const media: Plan["media"] = [];
  for (const s of strings(json)) {
    if (s.length > 1000 || !isAbsolute(s) || seen.has(s) || SKIP_EXT.has(extname(s).toLowerCase())) continue;
    seen.add(s);
    const st = await stat(s).catch(() => null);
    if (st?.isFile()) media.push({ path: s, size: st.size });
  }
  return { collection, media, bytes: media.reduce((n, m) => n + m.size, 0), json };
}

const safeName = (i: number, path: string) => {
  const base = basename(path).replace(/[^A-Za-z0-9._-]/g, "_").slice(-60) || "fichier";
  return `media/${String(i + 1).padStart(4, "0")}-${base}`;
};

/** Crée l'archive .tgz dans `outFile`. Renvoie sa taille et le nombre de médias. */
export async function createArchive(collection: string, outFile: string, o: { obs: string; host: string; onProgress?: (done: number, total: number) => void }) {
  const p = await plan(collection);
  const named = p.media.map((m, i) => ({ ...m, name: safeName(i, m.path) }));
  const byPath = new Map(named.map((m) => [m.path, m.name]));
  const json = replaceStrings(p.json, (s) => (byPath.has(s) ? MARK(byPath.get(s)!) : s));
  const manifest: Manifest = { version: 1, collection, created: new Date().toISOString(), obs: o.obs, host: o.host, media: named.map((m) => ({ name: m.name, original: m.path, size: m.size })) };
  const mem = (name: string, v: unknown): TarFile => {
    const data = Buffer.from(JSON.stringify(v));
    return { name, data, size: data.length };
  };
  const files: TarFile[] = [mem("manifest.json", manifest), mem("collection.json", json), ...named.map((m) => ({ name: m.name, path: m.path, size: m.size }))];
  const total = p.bytes;
  let done = 0;
  const counter = new Transform({
    transform(c: Buffer, _e, cb) {
      o.onProgress?.((done += c.length), total);
      cb(null, c);
    },
  });
  await mkdir(join(outFile, ".."), { recursive: true });
  await pipeline(tarStream(files), counter, createGzip({ level: 6 }), createWriteStream(outFile));
  return { size: await fileSize(outFile), media: named.length, bytes: total };
}

export const mediaRoot = () => process.env.SYXTEE_LINK_MEDIA || join(homedir(), "SYXTEE Link", "Médias");

/** Restaure une archive (flux .tgz) : médias dans <mediaRoot>/<id>/, collection ajoutée à OBS sous « <nom> (SYXTEE) ». Ne touche à aucune collection existante. */
export async function restoreArchive(input: Readable, id: string, onProgress?: (bytes: number) => void): Promise<{ collection: string; media: number }> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("identifiant invalide");
  const root = join(mediaRoot(), id);
  let manifest: Manifest | null = null;
  let json: unknown = null;
  let bytes = 0;
  const gunzip = createGunzip();
  const counter = new Transform({
    transform(c: Buffer, _e, cb) {
      onProgress?.((bytes += c.length));
      cb(null, c);
    },
  });
  gunzip.on("error", (e) => counter.destroy(e));
  input.on("error", (e) => gunzip.destroy(e));
  const src = input.pipe(gunzip).pipe(counter);
  let media = 0;
  const readJson = async (c: Readable) => {
    const parts: Buffer[] = [];
    let n = 0;
    for await (const x of c) {
      n += (x as Buffer).length;
      if (n > 64 * 1024 * 1024) throw new Error("collection trop grande");
      parts.push(x as Buffer);
    }
    return JSON.parse(Buffer.concat(parts).toString("utf8")) as unknown;
  };
  await untar(src, async (name, _size, content) => {
    if (name === "manifest.json") manifest = (await readJson(content)) as Manifest;
    else if (name === "collection.json") json = await readJson(content);
    else {
      await writeInto(root, name, content);
      media++;
    }
  });
  if (!manifest || json === null) throw new Error("Archive incomplète.");
  const m = manifest as Manifest;
  const fixed = replaceStrings(json, (s) => {
    const hit = MARK_RE.exec(s);
    return hit ? join(root, hit[1]) : s;
  }) as Record<string, unknown>;
  const base = `${String(m.collection).replace(/[/\\\0]/g, "_").slice(0, 100)} (SYXTEE)`;
  let name = base;
  for (let i = 2; existsSync(join(scenesDir(), `${name}.json`)); i++) name = `${base} ${i}`;
  fixed.name = name;
  await mkdir(scenesDir(), { recursive: true });
  await writeFile(join(scenesDir(), `${name}.json`), JSON.stringify(fixed, null, 4));
  return { collection: name, media };
}
