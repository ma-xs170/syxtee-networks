import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import { rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";
import { untar } from "./untar.ts";

// Sauvegardes de scènes (SYXTEE Link), 5 Go de quota par compte. Deux formats :
//
//  - format 2 (actuel), LÉGER : chaque fichier (média, collection) est identifié par son SHA-256 et stocké UNE SEULE FOIS par compte,
//    partagé entre versions et collections. Une version n'est qu'un manifeste (collection + liste de hachages). L'agent demande
//    d'abord quels fichiers manquent (begin) et n'envoie que ceux-là (blobs), puis valide (commit). Le quota compte les octets
//    uniques réellement stockés. Supprimer une version ne libère que les fichiers qu'aucune autre version ne référence plus.
//  - format 1 (ancien) : une archive .tgz entière par version. Lue et téléchargeable comme avant ; convertie en format 2 par migrate().
//
// Les fichiers sont sur le disque du Core, les métadonnées dans les tables link_backups (0025, 0042, 0044) et link_blobs (0044).

export const QUOTA_BYTES = 5 * 1024 ** 3;

/** Versions gardées par collection : les plus anciennes sont supprimées à la validation suivante. */
export const KEEP_VERSIONS = 4;
/** Un fichier envoyé depuis moins d'une heure n'est jamais supprimé par le nettoyage (envoi en cours, version pas encore validée). */
export const GC_GRACE_MS = 3_600_000;
const MAX_FILE = 6 * 1024 ** 3;
const MAX_FILES = 20_000;

export type BackupRow = { id: string; user_id: string; name: string; collection: string; version: number; size: number; media_count: number; obs_version: string; host: string; created_at: string; format: 1 | 2; new_bytes: number };
export type PutMeta = { name: string; collection: string; media: number; obs: string; host: string };
export type FileRef = { sha256: string; size: number };
export type ManifestFile = FileRef & { name: string };
export type Manifest = { format: 2; collection: string; created: string; obs: string; host: string; collection_sha256: string; collection_size: number; files: ManifestFile[] };
export type BeginMeta = { collection: string; collection_sha256: string; collection_size: number; files: FileRef[] };
export type CommitMeta = { name: string; collection: string; obs: string; host: string; collection_sha256: string; collection_size: number; files: ManifestFile[] };
export type DbLike = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type BlobRow = { sha256: string; size: number; stored_size: number; encoding: "raw" | "gzip"; created_at: string };

const clean = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);
export const SHA = /^[0-9a-f]{64}$/;
/** Types déjà compressés (images, vidéos, sons, archives) : stockés tels quels. Le reste (texte, JSON, SVG…) est compressé. */
const TEXT_EXT = /\.(json|txt|svg|xml|html?|css|js|csv|log|cfg|ini|srt|ass|vtt|md|ya?ml)$/i;
export const isCompressible = (name: string) => TEXT_EXT.test(name);

export function createBackups(o: { db: DbLike; dir: string; quota?: number; log?: (m: string) => void; now?: () => number }) {
  const quota = o.quota ?? QUOTA_BYTES;
  const log = o.log ?? (() => {});
  const now = o.now ?? Date.now;
  const reserved = new Map<string, number>(); // octets annoncés par les envois en cours, par compte
  const file = (userId: string, id: string) => join(o.dir, userId, `${id}.tgz`);
  const blobPath = (userId: string, sha: string) => join(o.dir, userId, "blobs", sha.slice(0, 2), sha);

  async function list(userId: string): Promise<BackupRow[]> {
    const { data } = await o.db.from("link_backups").select("id, user_id, name, collection, version, size, media_count, obs_version, host, created_at, format, new_bytes").eq("user_id", userId);
    return ((data as BackupRow[] | null) ?? [])
      .map((r) => ({ ...r, size: Number(r.size), version: Number(r.version ?? 1), format: Number(r.format ?? 1) === 2 ? (2 as const) : (1 as const), new_bytes: Number(r.new_bytes ?? 0) }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  async function blobRows(userId: string): Promise<BlobRow[]> {
    const { data } = await o.db.from("link_blobs").select("sha256, size, stored_size, encoding, created_at").eq("user_id", userId);
    return ((data as BlobRow[] | null) ?? []).map((b) => ({ ...b, size: Number(b.size), stored_size: Number(b.stored_size) }));
  }

  /** Octets réellement stockés : archives de l'ancien format + fichiers uniques du nouveau. */
  async function usageParts(userId: string) {
    const [rows, blobs] = await Promise.all([list(userId), blobRows(userId)]);
    const legacy = rows.filter((r) => r.format === 1).reduce((n, r) => n + r.size, 0);
    const unique = blobs.reduce((n, b) => n + b.stored_size, 0);
    return { used: legacy + unique, legacy, unique, quota };
  }
  const usage = async (userId: string) => {
    const { used } = await usageParts(userId);
    return { used, quota };
  };

  async function manifests(userId: string): Promise<{ id: string; collection: string; manifest: Manifest }[]> {
    const { data } = await o.db.from("link_backups").select("id, collection, manifest").eq("user_id", userId).eq("format", 2);
    return ((data as { id: string; collection: string; manifest: Manifest | null }[] | null) ?? []).filter((r): r is { id: string; collection: string; manifest: Manifest } => !!r.manifest);
  }
  const refsOf = (m: Manifest) => [m.collection_sha256, ...m.files.map((f) => f.sha256)];

  /** Supprime les fichiers qu'aucune version ne référence plus (et qui ont plus d'une heure). */
  async function gc(userId: string): Promise<{ removed: number; freed: number }> {
    const referenced = new Set((await manifests(userId)).flatMap((m) => refsOf(m.manifest)));
    let removed = 0;
    let freed = 0;
    for (const b of await blobRows(userId)) {
      if (referenced.has(b.sha256) || now() - Date.parse(b.created_at) < GC_GRACE_MS) continue;
      await rm(blobPath(userId, b.sha256), { force: true });
      await o.db.from("link_blobs").delete().eq("user_id", userId).eq("sha256", b.sha256);
      removed++;
      freed += b.stored_size;
    }
    return { removed, freed };
  }

  /** Écrit un flux dans `dest` en vérifiant son contenu : SHA-256 du fichier d'origine (décompressé si gzip) et tailles annoncées. */
  async function writeVerified(dest: string, body: Readable, length: number, expect: { sha: string; size: number; encoding: "raw" | "gzip" }): Promise<"ok" | "mismatch" | "aborted"> {
    mkdirSync(dirname(dest), { recursive: true });
    const part = `${dest}.part`;
    const hash = createHash("sha256");
    let stored = 0;
    let raw = 0;
    let bad = false;
    const gunzip = expect.encoding === "gzip" ? createGunzip() : null;
    const feed = (c: Buffer) => {
      raw += c.length;
      if (raw > expect.size) bad = true; // plus long qu'annoncé (ou bombe de décompression)
      else hash.update(c);
    };
    if (gunzip) {
      gunzip.on("data", feed);
      gunzip.on("error", () => (bad = true));
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const out = createWriteStream(part, { flags: "wx" });
        let failed: Error | null = null;
        let ended = false;
        out.on("error", (e) => (failed ??= e));
        body.on("data", (chunk: Buffer) => {
          if (failed || bad) return;
          stored += chunk.length;
          if (stored > length) {
            bad = true;
            return;
          }
          if (gunzip) gunzip.write(chunk);
          else feed(chunk);
          if (!out.write(chunk)) {
            body.pause();
            out.once("drain", () => body.resume());
          }
        });
        body.on("end", () => {
          ended = true;
          const finish = () => out.end(() => (failed ? reject(failed) : resolve()));
          if (gunzip) {
            gunzip.once("end", finish);
            gunzip.end();
          } else finish();
        });
        body.on("error", reject);
        body.on("close", () => {
          if (!ended) reject(new Error("aborted"));
        });
      });
      if (bad || stored !== length || raw !== expect.size || hash.digest("hex") !== expect.sha) {
        await rm(part, { force: true });
        return "mismatch";
      }
      await rename(part, dest);
      return "ok";
    } catch {
      await rm(part, { force: true });
      return "aborted";
    }
  }

  const api = {
    quota,
    usage,
    list,

    // ───── Format 1 (archives .tgz) ─────

    /** Enregistre l'archive reçue. `length` : taille annoncée (Content-Length), vérifiée octet par octet. */
    async put(userId: string, meta: PutMeta, body: Readable, length: number): Promise<{ id: string; size: number; version: number } | { error: "length_required" | "quota" | "aborted" | "server" }> {
      if (!Number.isFinite(length) || length <= 0) return { error: "length_required" };
      const used = (await usage(userId)).used;
      const pending = reserved.get(userId) ?? 0;
      if (used + pending + length > quota) {
        body.resume();
        return { error: "quota" };
      }
      reserved.set(userId, pending + length);
      const id = crypto.randomUUID();
      const dest = file(userId, id);
      const part = `${dest}.part`;
      try {
        mkdirSync(join(o.dir, userId), { recursive: true });
        let seen = 0;
        // Copie à la main plutôt qu'avec pipeline() : en cas de taille mensongère on vide le flux entrant au lieu de le détruire,
        // pour pouvoir répondre proprement à l'agent.
        await new Promise<void>((resolve, reject) => {
          const out = createWriteStream(part, { flags: "wx" });
          let failed: Error | null = null;
          let ended = false;
          out.on("error", (e) => {
            failed ??= e;
          });
          body.on("data", (chunk: Buffer) => {
            if (failed) return;
            seen += chunk.length;
            if (seen > length) {
              failed = new Error("too_long");
              out.destroy();
              return;
            }
            if (!out.write(chunk)) {
              body.pause();
              out.once("drain", () => body.resume());
            }
          });
          body.on("end", () => {
            ended = true;
            if (failed) return reject(failed);
            out.end(() => resolve());
          });
          body.on("error", reject);
          body.on("close", () => {
            if (!ended) reject(new Error("aborted"));
          });
        });
        if (seen !== length) throw new Error("short");
        await rename(part, dest);
        const collection = clean(meta.collection, 80);
        const siblings = collection ? (await list(userId)).filter((r) => r.collection === collection) : [];
        const version = siblings.reduce((n, r) => Math.max(n, r.version), 0) + 1;
        const { error } = await o.db.from("link_backups").insert({
          id, user_id: userId, name: clean(meta.name, 60) || "Sauvegarde", collection, version, size: length,
          media_count: Math.max(0, Math.min(100000, Math.floor(Number(meta.media) || 0))), obs_version: clean(meta.obs, 20), host: clean(meta.host, 60),
        });
        if (error) throw new Error("db");
        // Versions : on ne garde que les plus récentes de cette collection.
        await pruneCollection(userId, collection, KEEP_VERSIONS - 1, siblings);
        return { id, size: length, version };
      } catch (e) {
        log(`sauvegarde : envoi échoué (${(e as Error).message})`);
        await rm(part, { force: true });
        await rm(dest, { force: true });
        return { error: (e as Error).message === "db" ? "server" : "aborted" };
      } finally {
        const left = (reserved.get(userId) ?? 0) - length;
        if (left > 0) reserved.set(userId, left);
        else reserved.delete(userId);
      }
    },

    /** Flux de lecture de l'archive (format 1), ou null si elle n'existe pas pour ce compte. */
    async open(userId: string, id: string): Promise<{ stream: Readable; size: number; row: BackupRow } | null> {
      const row = (await list(userId)).find((r) => r.id === id && r.format === 1);
      if (!row) return null;
      try {
        const st = await stat(file(userId, id));
        return { stream: createReadStream(file(userId, id)), size: st.size, row };
      } catch {
        return null;
      }
    },

    /** Supprime une version (et, en format 2, les fichiers que plus aucune version ne référence). */
    async remove(userId: string, id: string): Promise<boolean> {
      const row = (await list(userId)).find((r) => r.id === id);
      const { data } = await o.db.from("link_backups").delete().eq("id", id).eq("user_id", userId).select("id");
      const ok = Array.isArray(data) && data.length > 0;
      if (ok) {
        await rm(file(userId, id), { force: true });
        if (row?.format === 2) await gc(userId);
      }
      return ok;
    },

    // ───── Format 2 (fichiers partagés) ─────

    /** Quels fichiers manquent ? L'agent n'enverra que ceux-là. Refuse d'avance si le quota ne suffirait pas. */
    async begin(userId: string, meta: BeginMeta): Promise<{ missing: string[]; used: number; quota: number } | { error: "invalid" | "quota"; used?: number; quota?: number }> {
      const refs = new Map<string, number>();
      const all: FileRef[] = [{ sha256: meta.collection_sha256, size: meta.collection_size }, ...meta.files];
      if (meta.files.length > MAX_FILES) return { error: "invalid" };
      for (const f of all) {
        if (!SHA.test(f.sha256) || !Number.isInteger(f.size) || f.size < 0 || f.size > MAX_FILE) return { error: "invalid" };
        refs.set(f.sha256, f.size);
      }
      const have = new Set((await blobRows(userId)).map((b) => b.sha256));
      const missing = [...refs.keys()].filter((s) => !have.has(s));
      const need = missing.reduce((n, s) => n + (refs.get(s) ?? 0), 0);
      const u = await usage(userId);
      if (u.used + (reserved.get(userId) ?? 0) + need > quota) return { error: "quota", used: u.used, quota };
      return { missing, used: u.used, quota };
    },

    /** Reçoit un fichier. Le contenu (décompressé si gzip) doit correspondre au SHA-256 et à la taille annoncés. Déjà connu : ignoré. */
    async putBlob(userId: string, sha: string, meta: { size: number; encoding: "raw" | "gzip" }, body: Readable, length: number): Promise<{ ok: true; existed: boolean; stored: number } | { error: "invalid" | "quota" | "mismatch" | "aborted" | "length_required" | "server" }> {
      if (!SHA.test(sha) || !Number.isInteger(meta.size) || meta.size < 0 || meta.size > MAX_FILE || (meta.encoding !== "raw" && meta.encoding !== "gzip")) {
        body.resume();
        return { error: "invalid" };
      }
      if (!Number.isFinite(length) || length < 0 || (meta.encoding === "raw" && length !== meta.size)) {
        body.resume();
        return { error: "length_required" };
      }
      const known = (await blobRows(userId)).find((b) => b.sha256 === sha);
      if (known) {
        body.resume();
        return { ok: true, existed: true, stored: known.stored_size };
      }
      const used = (await usage(userId)).used;
      const pending = reserved.get(userId) ?? 0;
      if (used + pending + length > quota) {
        body.resume();
        return { error: "quota" };
      }
      reserved.set(userId, pending + length);
      try {
        const r = await writeVerified(blobPath(userId, sha), body, length, { sha, size: meta.size, encoding: meta.encoding });
        if (r !== "ok") return { error: r };
        const { error } = await o.db.from("link_blobs").insert({ user_id: userId, sha256: sha, size: meta.size, stored_size: length, encoding: meta.encoding, created_at: new Date(now()).toISOString() });
        if (error) {
          await rm(blobPath(userId, sha), { force: true });
          return { error: "server" };
        }
        return { ok: true, existed: false, stored: length };
      } finally {
        const left = (reserved.get(userId) ?? 0) - length;
        if (left > 0) reserved.set(userId, left);
        else reserved.delete(userId);
      }
    },

    /** Valide la version : tous les fichiers sont là, le manifeste est enregistré. Garde les 4 dernières versions de la collection. */
    async commit(userId: string, meta: CommitMeta): Promise<{ id: string; version: number; size: number; new_bytes: number; used: number } | { error: "invalid" | "missing" | "server"; missing?: string[] }> {
      if (!SHA.test(meta.collection_sha256) || !Number.isInteger(meta.collection_size) || meta.collection_size < 0 || meta.files.length > MAX_FILES) return { error: "invalid" };
      for (const f of meta.files) if (!SHA.test(f.sha256) || !Number.isInteger(f.size) || f.size < 0 || !f.name || f.name.length > 120) return { error: "invalid" };
      const blobs = new Map((await blobRows(userId)).map((b) => [b.sha256, b]));
      const wanted = [...new Set([meta.collection_sha256, ...meta.files.map((f) => f.sha256)])];
      const missing = wanted.filter((s) => !blobs.has(s));
      if (missing.length) return { error: "missing", missing };

      const collection = clean(meta.collection, 80);
      const existing = await manifests(userId);
      const others = new Set(existing.flatMap((m) => refsOf(m.manifest)));
      const newBytes = wanted.filter((s) => !others.has(s)).reduce((n, s) => n + (blobs.get(s)?.stored_size ?? 0), 0);
      const logical = meta.collection_size + meta.files.reduce((n, f) => n + f.size, 0);
      const manifest: Manifest = {
        format: 2, collection, created: new Date(now()).toISOString(), obs: clean(meta.obs, 20), host: clean(meta.host, 60),
        collection_sha256: meta.collection_sha256, collection_size: meta.collection_size,
        files: meta.files.map((f) => ({ sha256: f.sha256, size: f.size, name: clean(f.name, 120) })),
      };
      const rows = await list(userId);
      const siblings = collection ? rows.filter((r) => r.collection === collection) : [];
      const version = siblings.reduce((n, r) => Math.max(n, r.version), 0) + 1;
      const id = crypto.randomUUID();
      const { error } = await o.db.from("link_backups").insert({
        id, user_id: userId, name: clean(meta.name, 60) || collection || "Sauvegarde", collection, version, size: Math.max(1, logical), media_count: meta.files.length,
        obs_version: manifest.obs, host: manifest.host, format: 2, manifest, new_bytes: newBytes,
      });
      if (error) return { error: "server" };
      await pruneCollection(userId, collection, KEEP_VERSIONS - 1, siblings);
      return { id, version, size: logical, new_bytes: newBytes, used: (await usage(userId)).used };
    },

    /** Manifeste d'une version (format 2) du compte, ou null. */
    async manifestOf(userId: string, id: string): Promise<Manifest | null> {
      return (await manifests(userId)).find((m) => m.id === id)?.manifest ?? null;
    },

    /** Contenu d'un fichier (toujours décompressé) si le compte le possède. */
    async blobStream(userId: string, sha: string): Promise<{ stream: Readable; size: number } | null> {
      if (!SHA.test(sha)) return null;
      const b = (await blobRows(userId)).find((x) => x.sha256 === sha);
      if (!b) return null;
      try {
        await stat(blobPath(userId, sha));
      } catch {
        return null;
      }
      const raw = createReadStream(blobPath(userId, sha));
      return { stream: b.encoding === "gzip" ? raw.pipe(createGunzip()) : raw, size: b.size };
    },

    gc,

    /**
     * Convertit les sauvegardes de l'ancien format (.tgz) en format 2 : chaque fichier est haché et stocké une seule fois par compte,
     * l'archive est supprimée seulement après réussite. Sans effet sur une base déjà convertie. `userId` : un seul compte.
     */
    async migrate(userId?: string): Promise<{ converted: number; failed: number; freed: number }> {
      let q = o.db.from("link_backups").select("id, user_id, collection, name, host, obs_version, created_at, size, media_count, version").eq("format", 1);
      if (userId) q = q.eq("user_id", userId);
      const { data } = await q;
      const rows = (data as { id: string; user_id: string; collection: string; name: string; host: string; obs_version: string; created_at: string; size: number }[] | null) ?? [];
      let converted = 0;
      let failed = 0;
      let freed = 0;
      for (const row of rows.sort((a, b) => (a.created_at < b.created_at ? -1 : 1))) {
        try {
          const before = Number(row.size);
          await convertOne(row);
          await rm(file(row.user_id, row.id), { force: true });
          converted++;
          freed += before;
        } catch (e) {
          failed++;
          log(`migration sauvegarde ${row.id.slice(0, 8)} : ${(e as Error).message}`);
        }
      }
      return { converted, failed, freed };
    },
  };

  /** Ne garde que `keep` versions (les plus récentes) de la collection, après l'ajout d'une nouvelle. */
  async function pruneCollection(userId: string, collection: string, keep: number, siblings: BackupRow[]) {
    if (!collection) return;
    const old = [...siblings].sort((a, b) => b.version - a.version).slice(keep);
    let anyV2 = false;
    for (const r of old) {
      await o.db.from("link_backups").delete().eq("id", r.id).eq("user_id", userId);
      await rm(file(userId, r.id), { force: true });
      if (r.format === 2) anyV2 = true;
    }
    if (anyV2) await gc(userId);
  }

  /** Convertit une archive .tgz en format 2 : fichiers vers le magasin partagé, repères de la collection par contenu. */
  async function convertOne(row: { id: string; user_id: string; collection: string; name: string; host: string; obs_version: string; created_at: string; size: number }) {
    const userId = row.user_id;
    const src = file(userId, row.id);
    const files: { name: string; sha: string; size: number }[] = [];
    let collectionJson = "";
    let manifestIn: { collection?: string; obs?: string; host?: string; created?: string } = {};
    const gunzip = createGunzip();
    const input = createReadStream(src);
    input.on("error", (e) => gunzip.destroy(e));
    await untar(input.pipe(gunzip), async (name, _size, content) => {
      const chunks: Buffer[] = [];
      if (name === "collection.json" || name === "manifest.json") {
        for await (const c of content) chunks.push(c as Buffer);
        const text = Buffer.concat(chunks).toString("utf8");
        if (name === "collection.json") collectionJson = text;
        else manifestIn = JSON.parse(text);
        return;
      }
      // Média : écrit dans un fichier temporaire en le hachant, puis rangé sous son hachage (ou jeté s'il existe déjà).
      const tmp = join(o.dir, userId, `.migrate-${row.id}-${files.length}.tmp`);
      mkdirSync(dirname(tmp), { recursive: true });
      const hash = createHash("sha256");
      let size = 0;
      const tap = new PassThrough();
      tap.on("data", (c: Buffer) => {
        hash.update(c);
        size += c.length;
      });
      const base = name.replace(/^media\/\d{4}-/, "");
      const gz = isCompressible(base);
      await pipeline(content, tap, ...(gz ? [createGzip({ level: 6 })] : []), createWriteStream(tmp));
      const sha = hash.digest("hex");
      await storeFile(userId, sha, size, gz ? "gzip" : "raw", tmp);
      files.push({ name, sha, size });
    });
    if (!collectionJson) throw new Error("archive sans collection");
    const byName = new Map(files.map((f) => [f.name, f]));
    const text = collectionJson.replace(/@@SYXTEE_MEDIA\/(media\/[A-Za-z0-9._-]{1,90})@@/g, (m, n: string) => {
      const f = byName.get(n);
      return f ? `@@SYXTEE_MEDIA/${f.sha}/${n.replace(/^media\/\d{4}-/, "")}@@` : m;
    });
    const colBuf = Buffer.from(text, "utf8");
    const colSha = createHash("sha256").update(colBuf).digest("hex");
    const tmp = join(o.dir, userId, `.migrate-${row.id}-col.tmp`);
    await pipeline(Readable.from([colBuf]), createGzip({ level: 6 }), createWriteStream(tmp));
    await storeFile(userId, colSha, colBuf.length, "gzip", tmp);

    const blobs = new Map((await blobRows(userId)).map((b) => [b.sha256, b]));
    const existing = await manifests(userId);
    const others = new Set(existing.flatMap((m) => refsOf(m.manifest)));
    const wanted = [...new Set([colSha, ...files.map((f) => f.sha)])];
    const newBytes = wanted.filter((s) => !others.has(s)).reduce((n, s) => n + (blobs.get(s)?.stored_size ?? 0), 0);
    const manifest: Manifest = {
      format: 2, collection: clean(manifestIn.collection ?? row.collection, 80), created: manifestIn.created ?? row.created_at, obs: clean(manifestIn.obs ?? row.obs_version, 20), host: clean(manifestIn.host ?? row.host, 60),
      collection_sha256: colSha, collection_size: colBuf.length, files: files.map((f) => ({ sha256: f.sha, size: f.size, name: clean(f.name.replace(/^media\/\d{4}-/, ""), 120) })),
    };
    const logical = colBuf.length + files.reduce((n, f) => n + f.size, 0);
    const { error } = await o.db.from("link_backups").update({ format: 2, manifest, size: Math.max(1, logical), new_bytes: newBytes }).eq("id", row.id).eq("user_id", userId);
    if (error) throw new Error("db");
  }

  /** Range un fichier temporaire sous son hachage dans le magasin du compte (ou le jette s'il y est déjà). */
  async function storeFile(userId: string, sha: string, size: number, encoding: "raw" | "gzip", tmp: string) {
    const known = (await blobRows(userId)).find((b) => b.sha256 === sha);
    if (known) return rm(tmp, { force: true });
    const stored = (await stat(tmp)).size;
    mkdirSync(dirname(blobPath(userId, sha)), { recursive: true });
    await rename(tmp, blobPath(userId, sha));
    const { error } = await o.db.from("link_blobs").insert({ user_id: userId, sha256: sha, size, stored_size: stored, encoding, created_at: new Date(now()).toISOString() });
    if (error) {
      await rm(blobPath(userId, sha), { force: true });
      throw new Error("db");
    }
  }

  return api;
}

export type Backups = ReturnType<typeof createBackups>;
