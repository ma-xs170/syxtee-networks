import { randomBytes } from "node:crypto";
import type { Relay, RelayStore } from "./relays.ts";
import type { Security } from "./security.ts";
import { kickPath } from "./mediamtx.ts";
import { supervise, type Supervised } from "./supervisor.ts";

// SYXTEE Cam : un téléphone publie en WebRTC (WHIP) vers MediaMTX, le Core relaie vers le relais SRT
// sur l'emplacement d'un relais du compte (publish_id) : OBS garde la même URL que pour Moblin.
//
// - Clé caméra (cam_key) : portée par un relais (le plus ancien relais actif du compte, sauf s'il en a déjà une),
//   secrète, 128 bits, sert de chemin MediaMTX et d'authentification de l'app /cam.
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
    // Toujours en stéréo : une source mono est doublée sur les deux canaux, une source stéréo reste telle quelle.
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
    "-f", "mpegts", output,
  ];
}

export type MediamtxAuth = { action?: string; path?: string; protocol?: string; ip?: string };

const LOCAL = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function createCam(o: {
  relays: RelayStore;
  security?: Pick<Security, "refused" | "isBanned"> | null;
  apiUrl: string;
  rtspUrl: string;
  whipBase: string;
  /** URL de sortie du relais pour un publish_id (SRT vers le SLS). */
  output: (publishId: string) => string;
  log: (m: string) => void;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = o.fetchImpl ?? fetch;
  const byCamKey = new Map<string, Relay>();
  const relays = new Map<string, { proc: Supervised; publishId: string }>();

  function setKeys(rows: Relay[]) {
    byCamKey.clear();
    for (const r of rows) if (r.cam_key) byCamKey.set(r.cam_key, r);
  }

  async function lookup(camKey: string): Promise<Relay | null> {
    if (!isCamKey(camKey)) return null;
    // Seuls les relais autorisés (setKeys) : un compte suspendu ou sans formule ne publie pas.
    return byCamKey.get(camKey) ?? null;
  }

  /** Relais qui porte la clé caméra du compte (null si le compte n'a aucun relais actif). */
  async function camRelay(userId: string): Promise<Relay | null> {
    const active = (await o.relays.list(userId)).filter((r) => !r.archived);
    return active.find((r) => r.cam_key) ?? active[0] ?? null;
  }

  async function setCamKey(userId: string, onlyIfMissing: boolean): Promise<Relay | null> {
    const row = await camRelay(userId);
    if (!row) return null;
    if (onlyIfMissing && row.cam_key) return row;
    // Course entre deux requêtes « onlyIfMissing » : l'autre a gagné, le store relit la ligne.
    const fresh = await o.relays.setCamKey(row, newCamKey(), onlyIfMissing);
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
      if (!row) {
        // Clé caméra régénérée, relais archivé ou compte refusé : le téléphone est coupé.
        if (await kickPath(o.apiUrl, path, fetchImpl)) o.log(`cam ${path.slice(0, 12)}… coupée (clé plus valable)`);
        continue;
      }
      const args = relayArgs(o.rtspUrl, path, o.output(row.publish_id));
      relays.set(path, { proc: supervise(`cam ${row.user_id.slice(0, 8)}`, "ffmpeg", args, o.log), publishId: row.publish_id });
      o.log(`cam ${row.user_id.slice(0, 8)} en ligne → relais`);
    }
  }

  return {
    setKeys,
    lookup,
    whipUrl: (camKey: string) => `${o.whipBase}/${camKey}/whip`,
    /** Clé caméra du compte (créée au besoin sur son relais ; null s'il n'a aucun relais actif). */
    ensure: (userId: string) => setCamKey(userId, true),
    /** Nouvelle clé caméra : l'ancien lien /cam cesse de marcher. */
    rotate: (userId: string) => setCamKey(userId, false),
    /** Décision d'autorisation pour MediaMTX. */
    async authorize(p: MediamtxAuth): Promise<boolean> {
      if (p.action === "publish") {
        const ip = (p.ip ?? "").replace(/^::ffff:/, "");
        if (o.security?.isBanned(ip)) return false;
        const ok = p.protocol === "webrtc" && (await lookup(p.path ?? "")) !== null;
        if (!ok) o.security?.refused({ protocol: "cam", ip, key: p.path ?? "", reason: p.protocol === "webrtc" ? "unknown_key" : "protocol" });
        return ok;
      }
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
