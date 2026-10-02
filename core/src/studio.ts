import { randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { Security } from "./security.ts";
import { kickPath } from "./mediamtx.ts";
import { supervise, type Supervised } from "./supervisor.ts";

// Diffusion depuis SYXTEE STUDIO : le navigateur publie son programme (image du canvas et son mixé) en WebRTC (WHIP) vers
// MediaMTX, puis le Core le ré-encode une fois (H.264, AAC) et l'envoie en RTMP vers une ou plusieurs plateformes (Twitch, Kick, YouTube…).
//
// - Une session par compte : chemin MediaMTX secret `stu_<hex>`, durée de vie courte tant que rien n'est publié.
// - Les adresses RTMP avec leurs clés de stream ne sont JAMAIS stockées : elles restent en mémoire du Core le temps de la session.
// - Protection SSRF : seules des adresses rtmp(s):// vers des IP publiques sont acceptées.
// - Un seul ffmpeg par session (un seul encodage), sortie en « tee » vers toutes les destinations : l'échec d'une n'arrête pas les autres.

export const newStudioPath = () => `stu_${randomBytes(16).toString("hex")}`;
export const isStudioPath = (s: string) => /^stu_[0-9a-f]{32}$/.test(s);

export type Destination = { name: string; url: string };
export const MAX_DESTINATIONS = 5;
const WAIT_MS = 10 * 60_000;

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^192\.0\.0\./, /^198\.1[89]\./, /^2(2[4-9]|[3-5]\d)\./];
/** Vrai si l'adresse est publique (ni locale, ni privée, ni réservée). */
export function isPublicIp(ip: string): boolean {
  const v4 = ip.replace(/^::ffff:/, "");
  if (isIP(v4) === 4) return !PRIVATE_V4.some((r) => r.test(v4));
  const s = ip.toLowerCase();
  return !(s === "::1" || s === "::" || s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe8") || s.startsWith("fe9") || s.startsWith("fea") || s.startsWith("feb"));
}

/** Valide une destination RTMP. Renvoie un message d'erreur, ou null si elle est acceptable. */
export async function checkDestination(d: Destination, resolve: (host: string) => Promise<string[]> = async (h) => (await lookup(h, { all: true })).map((a) => a.address)): Promise<string | null> {
  if (typeof d.url !== "string" || d.url.length > 600) return "url_invalid";
  let u: URL;
  try {
    u = new URL(d.url);
  } catch {
    return "url_invalid";
  }
  if (u.protocol !== "rtmp:" && u.protocol !== "rtmps:") return "protocol";
  if (u.username || u.password) return "url_invalid";
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return "host_private";
  if (isIP(host)) return isPublicIp(host) ? null : "host_private";
  try {
    const addrs = await resolve(host);
    if (addrs.length === 0 || !addrs.every(isPublicIp)) return "host_private";
  } catch {
    return "host_unresolved";
  }
  return null;
}

/** Arguments ffmpeg : MediaMTX (RTSP local) → H.264 + AAC → RTMP vers toutes les destinations (tee, onfail=ignore). */
export function studioArgs(rtspUrl: string, path: string, urls: string[], bitrateKbps: number) {
  const b = Math.max(1000, Math.min(8000, Math.round(bitrateKbps)));
  const tee = urls.map((u) => `[f=flv:onfail=ignore]${u.replace(/([|\[\]\\])/g, "\\$1")}`).join("|");
  return [
    "-hide_banner", "-loglevel", "error",
    "-rtsp_transport", "tcp",
    "-i", `${rtspUrl}/${path}`,
    "-map", "0:v:0", "-map", "0:a:0?",
    // Un seul encodage : image régulière (images clés toutes les 2 s, exigées par les plateformes), débit constant.
    "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-r", "30", "-g", "60", "-keyint_min", "60", "-sc_threshold", "0",
    "-b:v", `${b}k`, "-maxrate", `${b}k`, "-bufsize", `${b * 2}k`,
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
    "-f", "tee", tee,
  ];
}

type Session = { userId: string; destinations: Destination[]; bitrateKbps: number; createdAt: number; proc?: Supervised; startedAt?: number };

export function createStudio(o: {
  apiUrl: string;
  rtspUrl: string;
  whipBase: string;
  log: (m: string) => void;
  security?: Pick<Security, "refused" | "isBanned"> | null;
  fetchImpl?: typeof fetch;
  resolve?: (host: string) => Promise<string[]>;
  now?: () => number;
}) {
  const fetchImpl = o.fetchImpl ?? fetch;
  // ffmpeg peut citer l'adresse de sortie (donc la clé de stream) dans ses erreurs : jamais dans les logs.
  const slog = (m: string) => o.log(m.replace(/rtmps?:\/\/\S+/gi, "rtmp://***"));
  const now = o.now ?? Date.now;
  const sessions = new Map<string, Session>(); // chemin → session
  const byUser = new Map<string, string>(); // compte → chemin
  let allowed = new Set<string>(); // comptes qui ont au moins un relais autorisé (formule, non suspendu)

  const drop = (path: string) => {
    const s = sessions.get(path);
    if (!s) return;
    s.proc?.stop();
    sessions.delete(path);
    if (byUser.get(s.userId) === path) byUser.delete(s.userId);
    void kickPath(o.apiUrl, path, fetchImpl);
  };

  return {
    /** Comptes autorisés à diffuser (mis à jour avec les clés des relais). */
    setUsers(ids: Set<string>) {
      allowed = ids;
    },
    canStream: (userId: string) => allowed.has(userId),
    /** Ouvre une session (remplace celle du compte). Renvoie une erreur métier ou le chemin WHIP. */
    async open(userId: string, destinations: Destination[], bitrateKbps: number): Promise<{ error: string } | { path: string; whip_url: string }> {
      if (!allowed.has(userId)) return { error: "not_allowed" };
      if (destinations.length === 0 || destinations.length > MAX_DESTINATIONS) return { error: "destinations" };
      for (const d of destinations) {
        const err = await checkDestination(d, o.resolve);
        if (err) return { error: err };
      }
      const old = byUser.get(userId);
      if (old) drop(old);
      const path = newStudioPath();
      sessions.set(path, { userId, destinations, bitrateKbps, createdAt: now() });
      byUser.set(userId, path);
      return { path, whip_url: `${o.whipBase}/${path}/whip` };
    },
    close(userId: string) {
      const p = byUser.get(userId);
      if (p) drop(p);
      return !!p;
    },
    status(userId: string) {
      const path = byUser.get(userId);
      const s = path ? sessions.get(path) : undefined;
      if (!s) return { state: "idle" as const, destinations: [] as string[] };
      return { state: s.proc ? ("live" as const) : ("waiting" as const), since: s.startedAt ?? null, destinations: s.destinations.map((d) => d.name) };
    },
    /** Décision d'autorisation pour MediaMTX : publication WebRTC sur un chemin de session, lecture locale seulement. */
    authorize(p: { action?: string; path?: string; protocol?: string; ip?: string }): boolean {
      if (p.action === "publish") {
        const ip = (p.ip ?? "").replace(/^::ffff:/, "");
        if (o.security?.isBanned(ip)) return false;
        const ok = p.protocol === "webrtc" && sessions.has(p.path ?? "");
        if (!ok) o.security?.refused({ protocol: "cam", ip, key: p.path ?? "", reason: p.protocol === "webrtc" ? "unknown_key" : "protocol" });
        return ok;
      }
      if (p.action === "read") return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(p.ip ?? "");
      return false;
    },
    /** Chaque seconde : démarre ffmpeg quand le navigateur publie, l'arrête quand il s'en va, nettoie les sessions oubliées. */
    async sync() {
      let ready: string[] = [];
      try {
        const res = await fetchImpl(`${o.apiUrl}/v3/paths/list?itemsPerPage=1000`, { signal: AbortSignal.timeout(2000) });
        if (!res.ok) return;
        const json = (await res.json()) as { items?: { name: string; ready: boolean }[] };
        ready = (json.items ?? []).filter((p) => p.ready && isStudioPath(p.name)).map((p) => p.name);
      } catch {
        return;
      }
      for (const [path, s] of sessions) {
        const up = ready.includes(path);
        if (s.proc && !up) {
          s.proc.stop();
          s.proc = undefined;
          s.startedAt = undefined;
          o.log(`studio ${s.userId.slice(0, 8)} : publication arrêtée`);
          // Le navigateur est parti : la session se ferme, il en demandera une autre.
          drop(path);
        } else if (!s.proc && up) {
          s.proc = supervise(`studio ${s.userId.slice(0, 8)}`, "ffmpeg", studioArgs(o.rtspUrl, path, s.destinations.map((d) => d.url), s.bitrateKbps), slog);
          s.startedAt = now();
          o.log(`studio ${s.userId.slice(0, 8)} en direct → ${s.destinations.length} destination(s)`);
        } else if (!s.proc && now() - s.createdAt > WAIT_MS) {
          drop(path); // personne n'a publié : la session expire
        }
      }
    },
    stopAll() {
      for (const p of [...sessions.keys()]) drop(p);
    },
  };
}

export type Studio = ReturnType<typeof createStudio>;
