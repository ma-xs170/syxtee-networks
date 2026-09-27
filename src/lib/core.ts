import "server-only";

// Client du SYXTEE Core (VPS), côté serveur Vercel uniquement : jeton de service CORE_API_TOKEN.
// Le navigateur appelle le Core directement (santé, aperçu) avec son jeton de session Supabase.

const coreUrl = (process.env.CORE_URL ?? "").trim().replace(/\/$/, "");
const token = (process.env.CORE_API_TOKEN ?? "").trim();
export const hasCore = coreUrl !== "" && token !== "";
/** URL publique du Core, transmise aux composants client du dashboard. */
export const publicCoreUrl = coreUrl;

export type StreamKeys = {
  mode: "direct" | "regie";
  regie_available: boolean;
  relay: { name: string; host: string };
  moblin_srtla_url: string;
  srt_publish_url: string;
  obs_srt_url: string;
  created_at: string;
  rotated_at: string | null;
};

export class CoreError extends Error {}

async function core<T>(path: string, method: "GET" | "POST" | "PUT" = "GET", body?: unknown): Promise<T | null> {
  if (!hasCore) throw new CoreError("Core non configuré");
  const res = await fetch(`${coreUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new CoreError(`Core ${method} ${path.split("/").slice(0, 3).join("/")} → ${res.status}`);
  return (await res.json()) as T;
}

export const getStreamKeys = (userId: string) => core<StreamKeys>(`/v1/users/${userId}/keys`);
export const createStreamKeys = (userId: string) => core<StreamKeys>(`/v1/users/${userId}/keys`, "POST");
export const rotateStreamKeys = (userId: string) => core<StreamKeys>(`/v1/users/${userId}/keys/rotate`, "POST");
export const setStreamMode = (userId: string, mode: StreamKeys["mode"]) => core<StreamKeys>(`/v1/users/${userId}/mode`, "PUT", { mode });
