import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { cloudError } from "./cloud.ts";
import { scenesDir } from "./obsconfig.ts";
import { mediaRoot, plan, replaceStrings } from "./scenesync.ts";

// Sauvegarde légère : chaque fichier est identifié par son SHA-256 et stocké UNE SEULE FOIS par compte (partagé entre versions et
// collections). Avant d'envoyer quoi que ce soit, on demande au serveur quels fichiers lui manquent : une 2e sauvegarde identique
// n'envoie presque rien. Exclus : caches, miniatures, fichiers temporaires, scripts Lua/Python (déjà exclus par plan()).
// Les fichiers texte (JSON, SVG, sous-titres…) sont compressés ; les médias (déjà compressés) partent tels quels.

/** Le Core n'a pas encore le format léger : l'appelant retombe sur l'archive .tgz. */
export class LegacyCore extends Error {}

const TEXT_EXT = /\.(json|txt|svg|xml|html?|css|js|csv|log|cfg|ini|srt|ass|vtt|md|ya?ml)$/i;
export const isCompressible = (name: string) => TEXT_EXT.test(name);
const SKIP_FILE = /(^|[\\/])(\.cache|cache|caches|thumbnails?|thumbs?|tmp|temp)[\\/]|\.(tmp|part|bak|crdownload|swp|lock)$|(^|[\\/])(\.DS_Store|Thumbs\.db|desktop\.ini)$/i;
/** Fichier à ne jamais sauvegarder (cache, miniature, temporaire). */
export const skipFile = (path: string) => SKIP_FILE.test(path);

export const MARK = (sha: string, name: string) => `@@SYXTEE_MEDIA/${sha}/${name}@@`;
const MARK_RE = /^@@SYXTEE_MEDIA\/([0-9a-f]{64})\/([A-Za-z0-9._-]{1,90})@@$/;

export type Progress = (fraction: number, message: string) => void;
export type Result = { id: string; version: number; size: number; new_bytes: number; files: number; uploaded: number };

async function sha256File(path: string, onBytes?: (n: number) => void): Promise<{ sha: string; size: number }> {
  const hash = createHash("sha256");
  let size = 0;
  for await (const c of createReadStream(path)) {
    hash.update(c as Buffer);
    size += (c as Buffer).length;
    onBytes?.((c as Buffer).length);
  }
  return { sha: hash.digest("hex"), size };
}

const safeBase = (path: string) => basename(path).replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "fichier";

type Call = (path: string, init?: RequestInit) => Promise<Response>;
const caller = (core: string, token: () => Promise<string>): Call => async (path, init = {}) => {
  const res = await fetch(`${core}${path}`, { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${await token()}` } }).catch(() => null);
  if (!res) throw new Error("Serveur injoignable.");
  return res;
};

/** Sauvegarde une collection : empreintes, fichiers manquants seulement, validation. */
export async function backupV2(o: { core: string; token: () => Promise<string>; collection: string; obs: string; host: string; onProgress?: Progress }): Promise<Result> {
  const call = caller(o.core, o.token);
  const progress = o.onProgress ?? (() => {});
  progress(0.01, "Lecture de la collection…");
  const p = await plan(o.collection);
  const media = p.media.filter((m) => !skipFile(m.path));
  const total = media.reduce((n, m) => n + m.size, 0) || 1;

  // 1. Empreintes (lecture seule, rien n'est modifié sur le disque d'OBS).
  const files: { path: string; name: string; sha: string; size: number }[] = [];
  const names = new Set<string>();
  let hashed = 0;
  for (const m of media) {
    const h = await sha256File(m.path, (n) => progress(0.02 + ((hashed += n) / total) * 0.28, "Calcul des empreintes…"));
    let name = safeBase(m.path);
    for (let i = 2; names.has(name); i++) name = `${i}-${safeBase(m.path)}`.slice(0, 90);
    names.add(name);
    files.push({ path: m.path, name, sha: h.sha, size: h.size });
  }
  const byPath = new Map(files.map((f) => [f.path, f]));
  const json = replaceStrings(p.json, (s) => {
    const f = byPath.get(s);
    return f ? MARK(f.sha, f.name) : s;
  });
  const col = Buffer.from(JSON.stringify(json), "utf8");
  const colSha = createHash("sha256").update(col).digest("hex");
  const refs = files.map((f) => ({ sha256: f.sha, size: f.size }));
  const meta = { collection: o.collection, collection_sha256: colSha, collection_size: col.length, files: refs };

  // 2. Quels fichiers manquent au serveur ?
  const begin = await call("/v1/link/backups/begin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(meta) });
  if (begin.status === 404) throw new LegacyCore();
  const b = (await begin.json().catch(() => ({}))) as { missing?: string[]; error?: string };
  if (!begin.ok || !b.missing) throw new Error(cloudError(b.error));
  const missing = new Set(b.missing);

  // 3. Envoi des fichiers manquants seulement.
  const queue: { sha: string; size: number; label: string; path?: string }[] = [];
  if (missing.has(colSha)) queue.push({ sha: colSha, size: col.length, label: "collection" });
  const seen = new Set<string>();
  for (const f of files) if (missing.has(f.sha) && !seen.has(f.sha)) (seen.add(f.sha), queue.push({ sha: f.sha, size: f.size, label: f.name, path: f.path }));
  const toSend = queue.reduce((n, q) => n + q.size, 0);
  let sent = 0;
  let uploaded = 0;
  for (const q of queue) {
    const send = async (body: Readable, length: number, encoding: "raw" | "gzip") => {
      const counter = new Transform({
        transform(c: Buffer, _e, cb) {
          progress(0.3 + (Math.min(1, (sent + 0) / (toSend || 1)) * 0.65), `Envoi : ${q.label}`);
          cb(null, c);
        },
      });
      const res = await call(`/v1/link/blobs/${q.sha}`, {
        method: "PUT",
        headers: { "content-type": "application/octet-stream", "content-length": String(length), "x-syxtee-size": String(q.size), "x-syxtee-encoding": encoding },
        body: Readable.toWeb(body.pipe(counter)) as unknown as ReadableStream,
        duplex: "half",
      } as RequestInit);
      const r = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(r.error === "mismatch" ? `« ${q.label} » a changé pendant la sauvegarde : réessaie.` : cloudError(r.error));
      uploaded += length;
    };
    if (!q.path) {
      const gz = await gzip(col);
      await send(Readable.from([gz]), gz.length, "gzip");
    } else if (isCompressible(q.label)) {
      const tmp = join(tmpdir(), `syxtee-blob-${process.pid}-${Date.now()}.gz`);
      try {
        await pipeline(createReadStream(q.path), createGzip({ level: 6 }), createWriteStream(tmp));
        await send(createReadStream(tmp), (await stat(tmp)).size, "gzip");
      } finally {
        await rm(tmp, { force: true });
      }
    } else {
      await send(createReadStream(q.path), q.size, "raw");
    }
    sent += q.size;
  }

  // 4. Validation de la version.
  progress(0.97, "Validation…");
  const commit = await call("/v1/link/backups/commit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...meta, name: o.collection, obs: o.obs, host: o.host, files: files.map((f) => ({ sha256: f.sha, size: f.size, name: f.name })) }),
  });
  const r = (await commit.json().catch(() => ({}))) as Partial<Result> & { error?: string };
  if (!commit.ok || !r.id) throw new Error(r.error === "missing" ? "Des fichiers n'ont pas été reçus : réessaie." : cloudError(r.error));
  return { id: r.id, version: r.version ?? 1, size: r.size ?? 0, new_bytes: r.new_bytes ?? 0, files: files.length, uploaded };
}

async function gzip(b: Buffer): Promise<Buffer> {
  const chunks: Buffer[] = [];
  await pipeline(Readable.from([b]), createGzip({ level: 6 }), async function (src) {
    for await (const c of src) chunks.push(c as Buffer);
  });
  return Buffer.concat(chunks);
}

type Manifest = { collection: string; collection_sha256: string; files: { sha256: string; size: number; name: string }[] };

/**
 * Importe une version : les fichiers manquants sont téléchargés dans <médias>/blobs/<sha>/<nom> (partagés entre imports), la collection
 * est ajoutée à OBS sous « <nom> (SYXTEE) » sans toucher à aucune collection existante.
 * Renvoie null si cette version est de l'ancien format (l'appelant utilise alors l'archive .tgz).
 */
export async function restoreV2(o: { core: string; token: () => Promise<string>; id: string; onProgress?: Progress }): Promise<{ collection: string; media: number } | null> {
  const call = caller(o.core, o.token);
  const progress = o.onProgress ?? (() => {});
  if (!/^[0-9a-f-]{36}$/.test(o.id)) throw new Error("identifiant invalide");
  const mres = await call(`/v1/link/backups/${o.id}/manifest`);
  if (mres.status === 404) return null;
  if (!mres.ok) throw new Error(cloudError(((await mres.json().catch(() => ({}))) as { error?: string }).error));
  const m = (await mres.json()) as Manifest;
  const root = join(mediaRoot(), "blobs");
  const total = m.files.reduce((n, f) => n + f.size, 0) || 1;
  let done = 0;
  const fetchBlob = async (sha: string, dest: string, size: number) => {
    if (existsSync(dest) && (await stat(dest)).size === size) return; // déjà là (autre import, même fichier)
    const res = await call(`/v1/link/blobs/${sha}`);
    if (!res.ok || !res.body) throw new Error(cloudError(((await res.json().catch(() => ({}))) as { error?: string }).error));
    await mkdir(join(dest, ".."), { recursive: true });
    const tmp = `${dest}.part`;
    const hash = createHash("sha256");
    const tap = new Transform({
      transform(c: Buffer, _e, cb) {
        hash.update(c);
        progress(0.02 + ((done += c.length) / total) * 0.9, "Téléchargement des médias…");
        cb(null, c);
      },
    });
    await pipeline(Readable.fromWeb(res.body as never), tap, createWriteStream(tmp));
    if (hash.digest("hex") !== sha) {
      await rm(tmp, { force: true });
      throw new Error("Un fichier reçu est corrompu : réessaie.");
    }
    await rename(tmp, dest);
  };
  for (const f of m.files) {
    if (!/^[0-9a-f]{64}$/.test(f.sha256) || !/^[A-Za-z0-9._-]{1,90}$/.test(f.name)) throw new Error("Manifeste invalide.");
    await fetchBlob(f.sha256, join(root, f.sha256, f.name), f.size);
  }
  // Collection : repères par contenu → chemins locaux.
  const colRes = await call(`/v1/link/blobs/${m.collection_sha256}`);
  if (!colRes.ok) throw new Error(cloudError(((await colRes.json().catch(() => ({}))) as { error?: string }).error));
  const json = JSON.parse(await colRes.text()) as Record<string, unknown>;
  const fixed = replaceStrings(json, (s) => {
    const hit = MARK_RE.exec(s);
    return hit ? join(root, hit[1], hit[2]) : s;
  }) as Record<string, unknown>;
  const base = `${String(m.collection).replace(/[/\\\0]/g, "_").slice(0, 100)} (SYXTEE)`;
  let name = base;
  for (let i = 2; existsSync(join(scenesDir(), `${name}.json`)); i++) name = `${base} ${i}`;
  fixed.name = name;
  await mkdir(scenesDir(), { recursive: true });
  await writeFile(join(scenesDir(), `${name}.json`), JSON.stringify(fixed, null, 4));
  return { collection: name, media: m.files.length };
}
