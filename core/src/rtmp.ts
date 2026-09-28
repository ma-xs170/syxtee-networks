import type { SupabaseClient } from "@supabase/supabase-js";
import { relayArgs } from "./cam.ts";
import type { Relay } from "./relays.ts";
import { supervise, type Supervised } from "./supervisor.ts";

// Entrée RTMP (caméras DJI, GoPro, Insta360, OBS…) : le srt-live-server ne reçoit que du SRT/SRTLA.
// MediaMTX (même instance que SYXTEE Cam, port 1935) reçoit rtmp://<hôte>:1935/live/<publish_id>,
// demande au Core si la publication est autorisée, puis le Core relaie le flux en SRT vers le SLS sur publish_id
// (vidéo copiée sans réencodage, son en AAC). OBS lit ensuite le relais en SRT, comme pour un relais SRTLA :
// santé, aperçu, historique et régie marchent sans rien de plus.

export const RTMP_APP = "live";
const PATH = new RegExp(`^${RTMP_APP}/(live_[0-9a-f]{32})$`);

/** Clé de diffusion contenue dans un chemin MediaMTX « live/<publish_id> », sinon null. */
export const rtmpKey = (path: string) => PATH.exec(path)?.[1] ?? null;

const LOCAL = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function createRtmp(o: {
  db: SupabaseClient;
  apiUrl: string;
  rtspUrl: string;
  /** URL de sortie du relais pour un publish_id (SRT vers le SLS). */
  output: (publishId: string) => string;
  log: (m: string) => void;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = o.fetchImpl ?? fetch;
  const byKey = new Map<string, Relay>(); // publish_id → relais RTMP actif
  const running = new Map<string, { proc: Supervised; relayId: string }>(); // chemin → relais ffmpeg

  async function lookup(publishId: string): Promise<Relay | null> {
    const cached = byKey.get(publishId);
    if (cached) return cached;
    const { data } = await o.db.from("relays").select("*").eq("publish_id", publishId).eq("protocol", "rtmp").eq("archived", false).maybeSingle();
    return (data as Relay | null) ?? null;
  }

  return {
    setKeys(rows: Relay[]) {
      byKey.clear();
      for (const r of rows) if (r.protocol === "rtmp" && !r.archived) byKey.set(r.publish_id, r);
    },

    /** Décision d'autorisation pour MediaMTX (publication RTMP d'un relais RTMP actif, lecture locale du Core). */
    async authorize(p: { action?: string; path?: string; protocol?: string; ip?: string }): Promise<boolean> {
      const key = rtmpKey(p.path ?? "");
      if (!key) return false;
      if (p.action === "publish") return p.protocol === "rtmp" && (await lookup(key)) !== null;
      if (p.action === "read") return LOCAL.has(p.ip ?? "");
      return false;
    },

    /** Aligne les relais ffmpeg sur les chemins RTMP prêts dans MediaMTX (appelé chaque seconde). */
    async sync() {
      let ready: string[] = [];
      try {
        const res = await fetchImpl(`${o.apiUrl}/v3/paths/list?itemsPerPage=1000`, { signal: AbortSignal.timeout(2000) });
        if (!res.ok) return;
        const json = (await res.json()) as { items?: { name: string; ready: boolean }[] };
        ready = (json.items ?? []).filter((p) => p.ready && rtmpKey(p.name)).map((p) => p.name);
      } catch {
        return; // MediaMTX absent ou redémarre : on réessaiera
      }
      for (const [path, r] of running) {
        // Chemin fermé, relais archivé, supprimé ou clé régénérée : on coupe.
        if (!ready.includes(path) || !byKey.has(rtmpKey(path)!)) {
          r.proc.stop();
          running.delete(path);
          o.log(`rtmp ${r.relayId.slice(0, 8)} arrêté`);
        }
      }
      for (const path of ready) {
        if (running.has(path)) continue;
        const relay = byKey.get(rtmpKey(path)!);
        if (!relay) continue;
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
