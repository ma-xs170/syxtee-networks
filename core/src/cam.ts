import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { KeyRow, KeyStore } from "./keys.ts";
import { supervise, type Supervised } from "./supervisor.ts";

// SYXTEE Cam : un téléphone publie en WebRTC (WHIP) vers MediaMTX, le Core relaie vers le relais SRT
// sur l'emplacement habituel de l'utilisateur (publish_id) : OBS garde la même URL que pour Moblin.
//
// - Clé caméra (cam_key) : secrète, 128 bits, sert de chemin MediaMTX et d'authentification de l'app /cam.
// - MediaMTX demande au Core si une publication est autorisée (POST /internal/mediamtx/auth).
// - Le Core lit l'API de MediaMTX chaque seconde : chemin prêt → relais ffmpeg (vidéo copiée, son → AAC).

export const newCamKey = () => `cam_${randomBytes(16).toString("hex")}`;
export const isCamKey = (s: string) => /^cam_[0-9a-f]{32}$/.test(s);

/** Arguments ffmpeg du relais : lecture RTSP locale de MediaMTX → MPEG-TS (H.264 copié, AAC) vers le relais. */
export function relayArgs(rtspUrl: string, path: string, output: string) {
  return [
    "-hide_banner", "-loglevel", "error",
    "-rtsp_transport", "tcp",
    "-i", `${rtspUrl}/${path}`,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
    "-f", "mpegts", output,
  ];
}

export type MediamtxAuth = { action?: string; path?: string; protocol?: string; ip?: string };

const LOCAL = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function createCam(o: {
  db: SupabaseClient;
  keys: KeyStore;
  apiUrl: string;
  rtspUrl: string;
  whipBase: string;
  /** URL de sortie du relais pour un publish_id (SRT vers le SLS). */
  output: (publishId: string) => string;
  log: (m: string) => void;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = o.fetchImpl ?? fetch;
  const byCamKey = new Map<string, KeyRow>();
  const relays = new Map<string, { proc: Supervised; publishId: string }>();

  function setKeys(rows: KeyRow[]) {
    byCamKey.clear();
    for (const r of rows) if (r.cam_key) byCamKey.set(r.cam_key, r);
  }

  async function lookup(camKey: string): Promise<KeyRow | null> {
    if (!isCamKey(camKey)) return null;
    const cached = byCamKey.get(camKey);
    if (cached) return cached;
    const { data } = await o.db.from("stream_keys").select("*").eq("cam_key", camKey).maybeSingle();
    if (data) byCamKey.set(camKey, data as KeyRow);
    return (data as KeyRow | null) ?? null;
  }

  async function setCamKey(userId: string, onlyIfMissing: boolean): Promise<KeyRow> {
    const row = await o.keys.ensure(userId);
    if (onlyIfMissing && row.cam_key) return row;
    const q = o.db.from("stream_keys").update({ cam_key: newCamKey() }).eq("user_id", userId);
    const { data, error } = await (onlyIfMissing ? q.is("cam_key", null) : q).select("*").maybeSingle();
    if (error) throw new Error(`cam_key : ${error.message}`);
    // Course entre deux requêtes « onlyIfMissing » : l'autre a gagné, on relit.
    const fresh = (data as KeyRow | null) ?? (await o.keys.get(userId))!;
    if (row.cam_key && row.cam_key !== fresh.cam_key) byCamKey.delete(row.cam_key);
    if (fresh.cam_key) byCamKey.set(fresh.cam_key, fresh);
    return fresh;
  }

  /** Arrête les relais dont le chemin n'est plus prêt, en démarre pour les nouveaux. */
  async function syncRelays() {
    let ready: string[] = [];
    try {
      const res = await fetchImpl(`${o.apiUrl}/v3/paths/list?itemsPerPage=1000`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return;
      const json = (await res.json()) as { items?: { name: string; ready: boolean }[] };
      ready = (json.items ?? []).filter((p) => p.ready && isCamKey(p.name)).map((p) => p.name);
    } catch {
      return; // MediaMTX absent ou redémarre : on réessaiera
    }
    for (const [path, r] of relays) {
      const row = byCamKey.get(path);
      if (!ready.includes(path) || !row || row.publish_id !== r.publishId) {
        r.proc.stop();
        relays.delete(path);
        o.log(`cam ${path.slice(0, 12)}… arrêtée`);
      }
    }
    for (const path of ready) {
      if (relays.has(path)) continue;
      const row = await lookup(path);
      if (!row) continue;
      const args = relayArgs(o.rtspUrl, path, o.output(row.publish_id));
      relays.set(path, { proc: supervise(`cam ${row.user_id.slice(0, 8)}`, "ffmpeg", args, o.log), publishId: row.publish_id });
      o.log(`cam ${row.user_id.slice(0, 8)} en ligne → relais`);
    }
  }

  return {
    setKeys,
    lookup,
    whipUrl: (camKey: string) => `${o.whipBase}/${camKey}/whip`,
    /** Clé caméra de l'utilisateur (créée au besoin, avec ses clés de stream). */
    ensure: (userId: string) => setCamKey(userId, true),
    /** Nouvelle clé caméra : l'ancien lien /cam cesse de marcher. */
    rotate: (userId: string) => setCamKey(userId, false),
    /** Décision d'autorisation pour MediaMTX. */
    async authorize(p: MediamtxAuth): Promise<boolean> {
      if (p.action === "publish") return p.protocol === "webrtc" && (await lookup(p.path ?? "")) !== null;
      if (p.action === "read") return LOCAL.has(p.ip ?? ""); // le relais du Core, en local uniquement
      return false;
    },
    syncRelays,
    publishing: (camKey: string) => relays.has(camKey),
    stopAll() {
      for (const r of relays.values()) r.proc.stop();
      relays.clear();
    },
  };
}

export type Cam = ReturnType<typeof createCam>;
