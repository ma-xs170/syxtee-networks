import { createHmac, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream, mkdirSync } from "node:fs";
import { readdir, rm, stat, statfs } from "node:fs/promises";
import { join } from "node:path";
import type { Readable } from "node:stream";
import type { Relay } from "./relays.ts";
import { supervise, type Supervised } from "./supervisor.ts";

// Enregistrement des flux : un ffmpeg par relais en direct qui a l'option « Enregistrer » activée lit le flux SRT du relais
// et l'écrit sans réencodage (CPU quasi nul) en fichiers MP4 fragmentés (lisibles même si le serveur s'arrête en plein direct).
// Fichiers : DATA_DIR/recordings/<compte>/<relais>/<date>.mp4. 10 Go par compte par défaut ; quand le quota est plein, ou que
// le disque du serveur manque de place, l'enregistrement s'arrête.
// Un direct peut dépasser les 10 Go (il n'est jamais coupé pour ça, sauf au plafond de sécurité) : tant que le compte dépasse son quota,
// ses fichiers sont supprimés 48 h après la fin de son dernier enregistrement. Sous le quota : 15 jours après chaque fichier.

export const QUOTA_BYTES = 10 * 1024 ** 3;
/** Délai avant suppression des fichiers d'un compte qui dépasse son quota. */
export const OVER_QUOTA_GRACE_MS = 48 * 3_600_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FILE = /^\d{8}-\d{6}\.(mp4|mov)$/;
export type RecordFormat = "mov" | "mp4";

export type RecordingFile = { relay_id: string; file: string; size: number; created_at: string; expires_at: string; recording: boolean };
export type Stopped = "quota" | "disk" | null;

/** Codec vidéo du flux (ffprobe, 15 s max) ; null si le flux ne répond pas. */
export function probeCodec(host: string, port: number, playId: string): Promise<string | null> {
  return new Promise((resolve) => {
    // Analyse bornée (3 s / 2 Mo) : avec la valeur par défaut (5 Mo), un flux à bas débit dépassait le délai et le codec restait inconnu.
    execFile("ffprobe", ["-v", "error", "-analyzeduration", "3000000", "-probesize", "2000000", "-select_streams", "v:0", "-show_entries", "stream=codec_name", "-of", "csv=p=0", `srt://${host}:${port}?streamid=${playId}&mode=caller&latency=200000`], { timeout: 15000 }, (err, out) => resolve(err ? null : out.trim().split("\n")[0] || null));
  });
}

export function recordArgs(o: { host: string; port: number; playId: string; dir: string; segmentS: number; hevc?: boolean; format?: RecordFormat }) {
  return [
    "-hide_banner", "-loglevel", "error",
    // Analyse plus longue : sans elle, l'audio arrivé après la vidéo n'était parfois pas détecté et le fichier restait muet.
    "-analyzeduration", "5000000", "-probesize", "10000000",
    "-i", `srt://${o.host}:${o.port}?streamid=${o.playId}&mode=caller&latency=200000`,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-c:v", "copy",
    // Audio ré-encodé en AAC stéréo 48 kHz (quelques kb/s de CPU) : lisible partout, resynchronisé sur la vidéo.
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2", "-af", "aresample=async=1:first_pts=0",
    // H.265 : étiquette hvc1 (hev1 par défaut), sinon QuickTime, Aperçu et Safari refusent d'ouvrir le fichier.
    ...(o.hevc ? ["-tag:v", "hvc1"] : []),
    "-f", "segment", "-segment_time", String(o.segmentS), "-reset_timestamps", "1", "-strftime", "1",
    "-segment_format", o.format ?? "mov", "-segment_format_options", "movflags=frag_keyframe+empty_moov+default_base_moof",
    join(o.dir, `%Y%m%d-%H%M%S.${o.format ?? "mov"}`),
  ];
}

export function createRecordings(o: {
  dir: string;
  host: string;
  port: number;
  secret: string;
  quota?: number;
  /** Plafond de sécurité : au-delà, l'enregistrement du compte s'arrête (par défaut 5 × le quota). */
  hardCap?: number;
  /** Place libre minimale sur le disque du serveur : en dessous, plus aucun enregistrement. */
  minFreeBytes: number;
  segmentS?: number;
  /** Durée de conservation : au-delà, les fichiers sont supprimés (purge). */
  retentionDays?: number;
  log: (m: string) => void;
  /** Remplaçables dans les tests. */
  freeBytes?: () => Promise<number>;
  probeImpl?: typeof probeCodec;
  superviseImpl?: typeof supervise;
}) {
  const quota = o.quota ?? QUOTA_BYTES;
  const hardCap = o.hardCap ?? quota * 5;
  const segmentS = o.segmentS ?? 900;
  const retentionDays = o.retentionDays ?? 15;
  const run = o.superviseImpl ?? supervise;
  const probe = o.probeImpl ?? probeCodec;
  const unknown = new Map<string, number>(); // échecs d'analyse du codec par relais
  const starting = new Set<string>(); // relais dont le codec est en cours d'analyse
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

  /** Fichiers du compte. Les fichiers périmés (en attente de purge) sont masqués, sauf avec `withExpired`. */
  async function files(user: string, withExpired = false): Promise<RecordingFile[]> {
    const out: RecordingFile[] = [];
    const mtimes = new Map<string, number>();
    const relayIds = await readdir(userDir(user)).catch(() => [] as string[]);
    for (const rid of relayIds) {
      if (!UUID.test(rid)) continue;
      for (const f of await readdir(relayDir(user, rid)).catch(() => [] as string[])) {
        if (!FILE.test(f)) continue;
        const st = await stat(join(relayDir(user, rid), f)).catch(() => null);
        if (!st) continue;
        mtimes.set(`${rid}/${f}`, st.mtimeMs);
        out.push({ relay_id: rid, file: f, size: st.size, created_at: st.birthtime.getTime() > 0 ? st.birthtime.toISOString() : st.mtime.toISOString(), expires_at: "", recording: running.has(rid) && Date.now() - st.mtimeMs < 20_000 });
      }
    }
    // Compte au-dessus du quota : tout part 48 h après la dernière écriture (jamais pendant un direct, la dernière écriture est « maintenant »).
    const over = total(out) > quota;
    const last = Math.max(0, ...mtimes.values());
    for (const f of out) {
      const normal = (mtimes.get(`${f.relay_id}/${f.file}`) ?? 0) + retentionDays * 86_400_000;
      f.expires_at = new Date(over ? Math.min(normal, last + OVER_QUOTA_GRACE_MS) : normal).toISOString();
    }
    const now = Date.now();
    return out.filter((f) => withExpired || f.recording || Date.parse(f.expires_at) > now).sort((a, b) => (a.file < b.file ? 1 : -1));
  }
  const total = (list: RecordingFile[]) => list.reduce((n, f) => n + f.size, 0);

  function stopRelay(id: string) {
    starting.delete(id);
    unknown.delete(id);
    running.get(id)?.p.stop();
    running.delete(id);
  }

  return {
    quota,
    files,
    /** Octets utilisés par le compte, quota et état (coupé pour quota plein ou disque du serveur plein). */
    async usage(user: string) {
      const list = await files(user);
      const used = total(list);
      const over = used > quota;
      // Date de suppression la plus proche quand le compte dépasse son quota (le compte à rebours des 48 h).
      const purgeAt = over && list.length ? list.reduce((m, f) => (f.expires_at < m ? f.expires_at : m), list[0].expires_at) : null;
      return { used, quota, retention_days: retentionDays, stopped: stopped.get(user) ?? null, over, grace_hours: OVER_QUOTA_GRACE_MS / 3_600_000, purge_at: purgeAt };
    },

    /** Aligne les enregistreurs sur les relais en direct (appelé à chaque changement de statut et toutes les 10 s). */
    async sync(live: Relay[]) {
      const want = live.filter((r) => r.record && !r.archived);
      const wantIds = new Set(want.map((r) => r.id));
      for (const id of [...running.keys()]) if (!wantIds.has(id)) stopRelay(id);
      const diskOk = (await freeBytes().catch(() => Number.POSITIVE_INFINITY)) >= o.minFreeBytes;
      const used = new Map<string, number>();
      stopped.clear();
      const launches: Promise<unknown>[] = [];
      for (const r of want) {
        if (!used.has(r.user_id)) used.set(r.user_id, total(await files(r.user_id)));
        const reason: Stopped = !diskOk ? "disk" : (used.get(r.user_id) ?? 0) >= hardCap ? "quota" : null;
        if (reason) {
          stopped.set(r.user_id, reason);
          stopRelay(r.id);
          continue;
        }
        if (running.has(r.id) || starting.has(r.id)) continue;
        const dir = relayDir(r.user_id, r.id);
        mkdirSync(dir, { recursive: true });
        starting.add(r.id);
        launches.push(probe(o.host, o.port, r.play_id)
          .then((codec) => {
            if (!starting.has(r.id) || running.has(r.id)) return;
            // Codec inconnu : on réessaie au prochain passage (10 s) ; au 3e échec on enregistre quand même, sans étiquette.
            if (!codec && (unknown.set(r.id, (unknown.get(r.id) ?? 0) + 1).get(r.id) ?? 0) < 3) return;
            unknown.delete(r.id);
            running.set(r.id, { user: r.user_id, p: run(`enregistrement ${r.id.slice(0, 8)}`, "ffmpeg", recordArgs({ host: o.host, port: o.port, playId: r.play_id, dir, segmentS, hevc: codec === "hevc", format: r.record_format === "mp4" ? "mp4" : "mov" }), o.log) });
          })
          .finally(() => starting.delete(r.id)));
      }
      await Promise.all(launches);
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

    /** Supprime les fichiers plus vieux que la durée de conservation (date de dernière écriture). Renvoie leur nombre. */
    async purge(now = Date.now()): Promise<number> {
      let n = 0;
      for (const user of await readdir(o.dir).catch(() => [] as string[])) {
        if (!UUID.test(user)) continue;
        for (const f of await files(user, true)) {
          if (f.recording || Date.parse(f.expires_at) > now) continue;
          await rm(join(relayDir(user, f.relay_id), f.file), { force: true });
          n++;
        }
      }
      return n;
    },

    /** Compte supprimé : tous ses enregistrements disparaissent. */
    async removeUser(user: string) {
      for (const [id, r] of running) if (r.user === user) stopRelay(id);
      await rm(userDir(user), { recursive: true, force: true });
    },

    /** Lien signé (5 min par défaut ; 1 h pour l'aperçu, qui se rouvre à chaque déplacement dans la vidéo) : le navigateur ne peut pas envoyer son jeton dans un simple lien. */
    sign(user: string, relay: string, file: string, now = Date.now(), ttlMs = 5 * 60_000) {
      const payload = Buffer.from(JSON.stringify({ u: user, r: relay, f: file, e: now + ttlMs })).toString("base64url");
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
