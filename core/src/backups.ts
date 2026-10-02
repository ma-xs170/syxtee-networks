import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import { rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Readable } from "node:stream";

// Sauvegardes de scènes (SYXTEE Link) : une archive .tgz par sauvegarde (collection OBS + médias), sur le disque du serveur,
// avec 5 Go de quota par compte. Les métadonnées sont dans la table link_backups (migration 0025).

export const QUOTA_BYTES = 5 * 1024 ** 3;

export type BackupRow = { id: string; user_id: string; name: string; collection: string; size: number; media_count: number; obs_version: string; host: string; created_at: string };
export type PutMeta = { name: string; collection: string; media: number; obs: string; host: string };
export type DbLike = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const clean = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);

export function createBackups(o: { db: DbLike; dir: string; quota?: number; log?: (m: string) => void }) {
  const quota = o.quota ?? QUOTA_BYTES;
  const log = o.log ?? (() => {});
  const reserved = new Map<string, number>(); // octets annoncés par les envois en cours, par compte
  const file = (userId: string, id: string) => join(o.dir, userId, `${id}.tgz`);

  async function list(userId: string): Promise<BackupRow[]> {
    const { data } = await o.db.from("link_backups").select("id, user_id, name, collection, size, media_count, obs_version, host, created_at").eq("user_id", userId);
    return ((data as BackupRow[] | null) ?? []).map((r) => ({ ...r, size: Number(r.size) })).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  const usedOf = (rows: BackupRow[]) => rows.reduce((n, r) => n + r.size, 0);

  return {
    quota,
    async usage(userId: string) {
      return { used: usedOf(await list(userId)), quota };
    },
    list,

    /** Enregistre l'archive reçue. `length` : taille annoncée (Content-Length), vérifiée octet par octet. */
    async put(userId: string, meta: PutMeta, body: Readable, length: number): Promise<{ id: string; size: number } | { error: "length_required" | "quota" | "aborted" | "server" }> {
      if (!Number.isFinite(length) || length <= 0) return { error: "length_required" };
      const used = usedOf(await list(userId));
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
        const { error } = await o.db.from("link_backups").insert({
          id, user_id: userId, name: clean(meta.name, 60) || "Sauvegarde", collection: clean(meta.collection, 80), size: length,
          media_count: Math.max(0, Math.min(100000, Math.floor(Number(meta.media) || 0))), obs_version: clean(meta.obs, 20), host: clean(meta.host, 60),
        });
        if (error) throw new Error("db");
        return { id, size: length };
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

    /** Flux de lecture de l'archive, ou null si elle n'existe pas pour ce compte. */
    async open(userId: string, id: string): Promise<{ stream: Readable; size: number; row: BackupRow } | null> {
      const row = (await list(userId)).find((r) => r.id === id);
      if (!row) return null;
      try {
        const st = await stat(file(userId, id));
        return { stream: createReadStream(file(userId, id)), size: st.size, row };
      } catch {
        return null;
      }
    },

    async remove(userId: string, id: string): Promise<boolean> {
      const { data } = await o.db.from("link_backups").delete().eq("id", id).eq("user_id", userId).select("id");
      const ok = Array.isArray(data) && data.length > 0;
      if (ok) await rm(file(userId, id), { force: true });
      return ok;
    },
  };
}

export type Backups = ReturnType<typeof createBackups>;
