import { relayArgs } from "./cam.ts";
import { kickPath } from "./mediamtx.ts";
import type { Relay } from "./relays.ts";
import type { Security } from "./security.ts";
import { supervise, type Supervised } from "./supervisor.ts";

// Entrée RTMP (caméras DJI, GoPro, Insta360, OBS…) : le srt-live-server ne reçoit que du SRT/SRTLA.
// MediaMTX (même instance que SYXTEE Cam, port 1935) reçoit rtmp://<hôte>:1935/live/<publish_id>,
// demande au Core si la publication est autorisée, puis le Core relaie le flux en SRT vers le SLS sur publish_id
// (vidéo copiée sans réencodage, son en AAC). OBS lit ensuite le relais en SRT, comme pour un relais SRTLA :
// santé, aperçu, historique et régie marchent sans rien de plus.
// Sécurité : seuls les relais RTMP autorisés (setKeys) publient ; un seul éditeur par clé (le 2e est refusé et le
// propriétaire alerté) ; IP bannie refusée ; une clé retirée coupe le publieur dans la seconde (API MediaMTX).

export const RTMP_APP = "live";
const PATH = new RegExp(`^${RTMP_APP}/(live_[0-9a-f]{32})$`);

/** Clé de diffusion contenue dans un chemin MediaMTX « live/<publish_id> », sinon null. */
export const rtmpKey = (path: string) => PATH.exec(path)?.[1] ?? null;

const LOCAL = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function createRtmp(o: {
  apiUrl: string;
  security?: Pick<Security, "refused" | "duplicate" | "isBanned"> | null;
  rtspUrl: string;
  /** URL de sortie du relais pour un publish_id (SRT vers le SLS). */
  output: (publishId: string) => string;
  log: (m: string) => void;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = o.fetchImpl ?? fetch;
  const byKey = new Map<string, Relay>(); // publish_id → relais RTMP autorisé
  const running = new Map<string, { proc: Supervised; relayId: string }>(); // chemin → relais ffmpeg
  let ready = new Set<string>(); // chemins publiés dans MediaMTX (relevé chaque seconde)

  /** IP du publieur RTMP en cours sur ce chemin (null si inconnue). */
  async function publisherIp(path: string): Promise<string | null> {
    try {
      const res = await fetchImpl(`${o.apiUrl}/v3/rtmpconns/list?itemsPerPage=1000`, { signal: AbortSignal.timeout(2000) });
      const items = ((await res.json()) as { items?: { path: string; state: string; remoteAddr: string }[] }).items ?? [];
      const c = items.find((i) => i.path === path && i.state === "publish");
      return c ? c.remoteAddr.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").replace(/^::ffff:/, "") : null;
    } catch {
      return null;
    }
  }

  return {
    setKeys(rows: Relay[]) {
      byKey.clear();
      for (const r of rows) if (r.protocol === "rtmp" && !r.archived) byKey.set(r.publish_id, r);
    },

    /** Décision d'autorisation pour MediaMTX (publication RTMP d'un relais RTMP autorisé, lecture locale du Core). */
    async authorize(p: { action?: string; path?: string; protocol?: string; ip?: string }): Promise<boolean> {
      const ip = (p.ip ?? "").replace(/^::ffff:/, "");
      if (p.action === "read") return LOCAL.has(p.ip ?? "") && rtmpKey(p.path ?? "") !== null;
      if (p.action !== "publish") return false;
      if (o.security?.isBanned(ip)) return false;
      const key = rtmpKey(p.path ?? "");
      const raw = (p.path ?? "").replace(new RegExp(`^${RTMP_APP}/`), "");
      if (!key || p.protocol !== "rtmp" || !byKey.has(key)) {
        o.security?.refused({ protocol: "rtmp", ip, key: raw, reason: p.protocol === "rtmp" ? "unknown_key" : "protocol" });
        return false;
      }
      if (ready.has(`${RTMP_APP}/${key}`)) {
        o.security?.duplicate({ protocol: "rtmp", ip, key, currentIp: await publisherIp(`${RTMP_APP}/${key}`) });
        return false;
      }
      return true;
    },

    /** Aligne les relais ffmpeg sur les chemins RTMP prêts dans MediaMTX (appelé chaque seconde). */
    async sync() {
      try {
        const res = await fetchImpl(`${o.apiUrl}/v3/paths/list?itemsPerPage=1000`, { signal: AbortSignal.timeout(2000) });
        if (!res.ok) return;
        const json = (await res.json()) as { items?: { name: string; ready: boolean }[] };
        ready = new Set((json.items ?? []).filter((p) => p.ready && p.name.startsWith(`${RTMP_APP}/`)).map((p) => p.name));
      } catch {
        return; // MediaMTX absent ou redémarre : on réessaiera
      }
      for (const [path, r] of running) {
        // Chemin fermé, relais archivé, supprimé ou clé régénérée : on coupe.
        if (!ready.has(path) || !byKey.has(rtmpKey(path)!)) {
          r.proc.stop();
          running.delete(path);
          o.log(`rtmp ${r.relayId.slice(0, 8)} arrêté`);
        }
      }
      for (const path of ready) {
        if (running.has(path)) continue;
        const key = rtmpKey(path);
        const relay = key ? byKey.get(key) : undefined;
        if (!relay) {
          // Clé régénérée, relais archivé ou compte refusé : la caméra est coupée (MediaMTX ne revérifie pas seul).
          if (await kickPath(o.apiUrl, path, fetchImpl)) o.log(`rtmp : publieur coupé (clé plus valable)`);
          continue;
        }
        const args = relayArgs(o.rtspUrl, path, o.output(relay.publish_id));
        running.set(path, { proc: supervise(`rtmp ${relay.id.slice(0, 8)}`, "ffmpeg", args, o.log), relayId: relay.id });
        o.log(`rtmp ${relay.id.slice(0, 8)} en ligne → relais`);
      }
    },

    publishing: (publishId: string) => running.has(`${RTMP_APP}/${publishId}`),

    stopAll() {
      for (const r of running.values()) r.proc.stop();
      running.clear();
    },
  };
}

export type Rtmp = ReturnType<typeof createRtmp>;
