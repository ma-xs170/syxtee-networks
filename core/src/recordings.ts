import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream, mkdirSync } from "node:fs";
import { readdir, rm, stat, statfs } from "node:fs/promises";
import { join } from "node:path";
import type { Readable } from "node:stream";
import type { Relay } from "./relays.ts";
import { supervise, type Supervised } from "./supervisor.ts";

// Enregistrement des flux : un ffmpeg par relais en direct qui a l'option « Enregistrer » activée lit le flux SRT du relais
// et l'écrit sans réencodage (CPU quasi nul) en fichiers MP4 fragmentés (lisibles même si le serveur s'arrête en plein direct).
// Fichiers : DATA_DIR/recordings/<compte>/<relais>/<date>.mp4. 10 Go par compte par défaut ; quand le quota est plein, ou que
// le disque du serveur manque de place, l'enregistrement s'arrête (jamais d'effacement automatique des fichiers du membre).

export const QUOTA_BYTES = 10 * 1024 ** 3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FILE = /^\d{8}-\d{6}\.mp4$/;

export type RecordingFile = { relay_id: string; file: string; size: number; created_at: string; recording: boolean };
export type Stopped = "quota" | "disk" | null;

export function recordArgs(o: { host: string; port: number; playId: string; dir: string; segmentS: number }) {
  return [
    "-hide_banner", "-loglevel", "error",
    "-i", `srt://${o.host}:${o.port}?streamid=${o.playId}&mode=caller&latency=200000`,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-c", "copy",
    "-f", "segment", "-segment_time", String(o.segmentS), "-reset_timestamps", "1", "-strftime", "1",
    "-segment_format", "mp4", "-segment_format_options", "movflags=frag_keyframe+empty_moov+default_base_moof",
    join(o.dir, "%Y%m%d-%H%M%S.mp4"),
  ];
}

export function createRecordings(o: {
  dir: string;
  host: string;
  port: number;
  secret: string;
  quota?: number;
  /** Place libre minimale sur le disque du serveur : en dessous, plus aucun enregistrement. */
  minFreeBytes: number;
  segmentS?: number;
  log: (m: string) => void;
  /** Remplaçables dans les tests. */
  freeBytes?: () => Promise<number>;
  superviseImpl?: typeof supervise;
}) {
  const quota = o.quota ?? QUOTA_BYTES;
  const segmentS = o.segmentS ?? 900;
  const run = o.superviseImpl ?? supervise;
  mkdirSync(o.dir, { recursive: true });
  const running = new Map<string, { p: Supervised; user: string }>();
  const stopped = new Map<string, Exclude<Stopped, null>>(); // par compte : pourquoi l'enregistrement est coupé
  const freeBytes =
    o.freeBytes ??
    (async () => {
      const s = await statfs(o.dir);
      return Number(s.bavail) * Number(s.bsize);
    });

  const userDir = (user: string) => join(o.dir, user);
  const relayDir = (user: string, relay: string) => join(o.dir, user, relay);

  async function files(user: string): Promise<RecordingFile[]> {
    const out: RecordingFile[] = [];
    const relayIds = await readdir(userDir(user)).catch(() => [] as string[]);
    for (const rid of relayIds) {
      if (!UUID.test(rid)) continue;
      for (const f of await readdir(relayDir(user, rid)).catch(() => [] as string[])) {
        if (!FILE.test(f)) continue;
        const st = await stat(join(relayDir(user, rid), f)).catch(() => null);
        if (!st) continue;
        out.push({ relay_id: rid, file: f, size: st.size, created_at: st.birthtime.getTime() > 0 ? st.birthtime.toISOString() : st.mtime.toISOString(), recording: running.has(rid) && Date.now() - st.mtimeMs < 20_000 });
      }
    }
    return out.sort((a, b) => (a.file < b.file ? 1 : -1));
  }
  const total = (list: RecordingFile[]) => list.reduce((n, f) => n + f.size, 0);

  function stopRelay(id: string) {
    running.get(id)?.p.stop();
    running.delete(id);
  }

  return {
    quota,
    files,
    /** Octets utilisés par le compte, quota et état (coupé pour quota plein ou disque du serveur plein). */
    async usage(user: string) {
      return { used: total(await files(user)), quota, stopped: stopped.get(user) ?? null };
    },

    /** Aligne les enregistreurs sur les relais en direct (appelé à chaque changement de statut et toutes les 10 s). */
    async sync(live: Relay[]) {
      const want = live.filter((r) => r.record && !r.archived);
      const wantIds = new Set(want.map((r) => r.id));
      for (const id of [...running.keys()]) if (!wantIds.has(id)) stopRelay(id);
      const diskOk = (await freeBytes().catch(() => Number.POSITIVE_INFINITY)) >= o.minFreeBytes;
      const used = new Map<string, number>();
      stopped.clear();
      for (const r of want) {
        if (!used.has(r.user_id)) used.set(r.user_id, total(await files(r.user_id)));
        const reason: Stopped = !diskOk ? "disk" : (used.get(r.user_id) ?? 0) >= quota ? "quota" : null;
        if (reason) {
          stopped.set(r.user_id, reason);
          stopRelay(r.id);
          continue;
        }
        if (running.has(r.id)) continue;
        const dir = relayDir(r.user_id, r.id);
        mkdirSync(dir, { recursive: true });
        running.set(r.id, { user: r.user_id, p: run(`enregistrement ${r.id.slice(0, 8)}`, "ffmpeg", recordArgs({ host: o.host, port: o.port, playId: r.play_id, dir, segmentS }), o.log) });
      }
    },

    /** Flux de lecture (avec plage d'octets) d'un fichier du compte, ou null. */
    async open(user: string, relay: string, file: string, range?: { start: number; end: number }): Promise<{ stream: Readable; size: number } | null> {
      if (!UUID.test(relay) || !FILE.test(file)) return null;
      const path = join(relayDir(user, relay), file);
      const st = await stat(path).catch(() => null);
      if (!st?.isFile()) return null;
      return { stream: createReadStream(path, range), size: st.size };
    },

    async remove(user: string, relay: string, file: string): Promise<boolean> {
      if (!UUID.test(relay) || !FILE.test(file)) return false;
      if (running.has(relay) && (await files(user)).some((f) => f.relay_id === relay && f.file === file && f.recording)) return false;
      const path = join(relayDir(user, relay), file);
      if (!(await stat(path).catch(() => null))) return false;
      await rm(path, { force: true });
      return true;
    },

    /** Compte supprimé : tous ses enregistrements disparaissent. */
    async removeUser(user: string) {
      for (const [id, r] of running) if (r.user === user) stopRelay(id);
      await rm(userDir(user), { recursive: true, force: true });
    },

    /** Lien de téléchargement signé (5 min) : le navigateur ne peut pas envoyer son jeton dans un simple lien. */
    sign(user: string, relay: string, file: string, now = Date.now()) {
      const payload = Buffer.from(JSON.stringify({ u: user, r: relay, f: file, e: now + 5 * 60_000 })).toString("base64url");
      return `${payload}.${createHmac("sha256", o.secret).update(payload).digest("base64url")}`;
    },
    verify(token: string, now = Date.now()): { user: string; relay: string; file: string } | null {
      const [payload, sig] = token.split(".");
      if (!payload || !sig) return null;
      const want = createHmac("sha256", o.secret).update(payload).digest();
      const got = Buffer.from(sig, "base64url");
      if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
      try {
        const p = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u: string; r: string; f: string; e: number };
        return p.e > now ? { user: p.u, relay: p.r, file: p.f } : null;
      } catch {
        return null;
      }
    },

    stopAll() {
      for (const id of [...running.keys()]) stopRelay(id);
    },
  };
}

export type Recordings = ReturnType<typeof createRecordings>;
