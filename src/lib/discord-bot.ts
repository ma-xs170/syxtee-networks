import "server-only";

// Client du bot Discord SYXTEE (VPS), côté serveur Vercel uniquement. Le bot est derrière le Caddy du Core sur /discord/*,
// avec le même jeton de service que le Core (CORE_API_TOKEN).

const base = `${(process.env.CORE_URL ?? "").trim().replace(/\/$/, "")}/discord/api`;
const token = (process.env.CORE_API_TOKEN ?? "").trim();
export const hasBot = base.startsWith("http") && token !== "";

export type BotCheck = { id: string; name: string; status: "up" | "slow" | "down"; ms: number | null; detail?: string };
export type BotStatus = {
  connected: boolean;
  tag: string | null;
  pingMs: number;
  guilds: number;
  uptimeS: number;
  channel: { id: string; name: string | null; ok: boolean };
  presence: { mode: "auto" | "custom"; type: "watching" | "playing" | "listening" | "competing"; text: string; current: string | null };
  alertsEnabled: boolean;
  services: BotCheck[];
  log: { at: string; kind: string; title: string; by: string }[];
};

export class BotError extends Error {}

async function call<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  if (!hasBot) throw new BotError("Bot non configuré");
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) throw new BotError("Le bot tourne une version sans panel : mise à jour du VPS nécessaire");
  if (!res.ok) throw new BotError(`Bot ${method} ${path} → ${res.status}`);
  return (await res.json()) as T;
}

export const getBotStatus = () => call<BotStatus>("/status");
export const botAnnounce = (b: { title: string; body: string; url?: string; tag?: string }) => call("/announce", "POST", b);
export const botPresence = (b: { mode: "auto" | "custom"; type: string; text: string }) => call("/presence", "POST", b);
export const botAlerts = (enabled: boolean) => call("/alerts", "POST", { enabled });
export const botPostServices = () => call("/services-post", "POST", {});
