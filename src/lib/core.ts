import "server-only";

// Client du SYXTEE Core (VPS), côté serveur Vercel uniquement : jeton de service CORE_API_TOKEN.
// Le navigateur appelle le Core directement (santé, aperçu) avec son jeton de session Supabase.

const coreUrl = (process.env.CORE_URL ?? "").trim().replace(/\/$/, "");
const token = (process.env.CORE_API_TOKEN ?? "").trim();
export const hasCore = coreUrl !== "" && token !== "";
/** URL publique du Core, transmise aux composants client du dashboard. */
export const publicCoreUrl = coreUrl;

export type RelayProtocol = "srtla" | "rtmp";

/** Un relais, tel que le Core le montre au dashboard. */
export type RelayView = {
  id: string;
  name: string;
  protocol: RelayProtocol;
  server: string;
  host: string;
  archived: boolean;
  live: boolean;
  mode: "direct" | "regie";
  regie_available: boolean;
  urls: { srtla_url?: string; srt_url?: string; rtmp_server?: string; rtmp_key?: string; rtmp_url?: string };
  obs_srt_url: string;
  created_at: string;
  rotated_at: string | null;
  last_live_at: string | null;
};

/** Erreur métier renvoyée par le Core (quota atteint, serveur indisponible…). */
export class CoreRefusal extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export class CoreError extends Error {}
/** Le Core répond, mais sans les routes des relais : il tourne une version plus ancienne que le dashboard. */
export class CoreOutdated extends CoreError {}

async function core<T>(path: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET", body?: unknown): Promise<T | null> {
  if (!hasCore) throw new CoreError("Core non configuré");
  const res = await fetch(`${coreUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404 || res.status === 204) return null;
  if (res.status === 403 || res.status === 409) throw new CoreRefusal(((await res.json().catch(() => ({}))) as { error?: string }).error ?? String(res.status));
  if (!res.ok) throw new CoreError(`Core ${method} ${path.split("/").slice(0, 3).join("/")} → ${res.status}`);
  return (await res.json()) as T;
}

// ───── Relais ─────

export async function listRelays(userId: string) {
  const res = await core<{ relays: RelayView[] }>(`/v1/users/${userId}/relays`);
  if (!res) throw new CoreOutdated("Core sans /relays : mise à jour du VPS nécessaire");
  return res.relays;
}
export const getRelay = (userId: string, relayId: string) => core<RelayView>(`/v1/users/${userId}/relays/${relayId}`);
/** Nouveau relais ; `limit` = relais actifs max de la formule (le Core recompte : 403 « quota » si atteint). */
export async function createRelay(userId: string, body: { name: string; protocol: RelayProtocol; server: string; limit: number }) {
  const relay = await core<RelayView>(`/v1/users/${userId}/relays`, "POST", body);
  if (!relay) throw new CoreOutdated("Core sans /relays : mise à jour du VPS nécessaire");
  return relay;
}
export const updateRelay = (userId: string, relayId: string, patch: { name?: string; archived?: boolean; mode?: RelayView["mode"]; limit?: number }) =>
  core<RelayView>(`/v1/users/${userId}/relays/${relayId}`, "PATCH", patch);
/** Nouvelle clé : l'ancienne cesse de marcher immédiatement. */
export const rotateRelay = (userId: string, relayId: string) => core<RelayView>(`/v1/users/${userId}/relays/${relayId}/rotate`, "POST");
export const deleteRelay = (userId: string, relayId: string) => core<null>(`/v1/users/${userId}/relays/${relayId}`, "DELETE");

// ───── SYXTEE Cam ─────

export type CamInfo = { cam_key: string; cam_path: string; whip_url: string; relay: { id: string; name: string } };

/** Clé caméra du compte (créée au besoin sur son relais ; null s'il n'a aucun relais actif). */
export const getCam = (userId: string) => core<CamInfo>(`/v1/users/${userId}/cam`);
/** Nouveau lien caméra : l'ancien cesse de marcher. */
export const rotateCam = (userId: string) => core<CamInfo>(`/v1/users/${userId}/cam/rotate`, "POST");

/** Compte supprimé : tous ses relais retirés du SLS (plus aucune URL Moblin/OBS/Cam ne marche) puis effacés. */
export const deleteAllRelays = (userId: string) => core<null>(`/v1/users/${userId}/relays`, "DELETE");
export const deleteCoverage = (userId: string) => core<{ deleted: number }>(`/v1/users/${userId}/coverage`, "DELETE");

// ───── Sécurité ─────

/** Alerte montrée au propriétaire : un 2e appareil a tenté de publier sur son relais. */
export type SecurityAlert = { at: string; relay_id: string | null; ip: string | null; country: string | null; protocol: string | null };
export type SecurityEvent = SecurityAlert & { kind: string; user_id: string | null; detail: Record<string, unknown> };
export type IpBan = { ip: string; until: string; reason: string; auto: boolean };

/** Alertes des 7 derniers jours (liste vide si le Core ne les connaît pas encore). */
export async function listAlerts(userId: string) {
  return (await core<{ alerts: SecurityAlert[] }>(`/v1/users/${userId}/alerts`))?.alerts ?? [];
}
/** Admin : refus récents et IP bannies. */
export const getSecurity = () => core<{ events: SecurityEvent[]; bans: IpBan[] }>("/v1/admin/security?limit=300");
export const banIp = (ip: string, minutes: number, reason: string) => core<IpBan>("/v1/admin/bans", "POST", { ip, minutes, reason });
export const unbanIp = (ip: string) => core<null>(`/v1/admin/bans/${encodeURIComponent(ip)}`, "DELETE");
