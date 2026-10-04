import { connect } from "node:net";
import type { Config } from "./config.ts";

// Sondes de l'état des services : HTTP (site, Core, Supabase) et TCP (RTMP, WHIP) mesurées depuis le VPS.

export type Status = "up" | "slow" | "down";
export type Check = { id: string; name: string; status: Status; ms: number | null; detail?: string };

const SLOW_MS = 1500;

function classify(ok: boolean, ms: number): Status {
  return !ok ? "down" : ms > SLOW_MS ? "slow" : "up";
}

async function http(url: string, headers: Record<string, string> = {}): Promise<{ ok: boolean; ms: number; body?: unknown }> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000), redirect: "follow" });
    const ms = Math.round(performance.now() - t0);
    // Toute réponse < 500 prouve que le service répond (Supabase renvoie 401 sans clé, MediaMTX 404 sur /).
    let body: unknown;
    if (res.headers.get("content-type")?.includes("json")) body = await res.json().catch(() => undefined);
    return { ok: res.status < 500, ms, body };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - t0) };
  }
}

function tcp(host: string, port: number): Promise<{ ok: boolean; ms: number }> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const s = connect({ host, port, timeout: 3000 });
    const done = (ok: boolean) => {
      s.destroy();
      resolve({ ok, ms: Math.round(performance.now() - t0) });
    };
    s.once("connect", () => done(true));
    s.once("error", () => done(false));
    s.once("timeout", () => done(false));
  });
}

export async function runChecks(cfg: Config): Promise<Check[]> {
  const core = cfg.CORE_URL.replace(/\/$/, "");
  const [site, coreHealth, rtmp, whip, db] = await Promise.all([
    http(cfg.SITE_URL),
    http(core + "/health"),
    tcp("127.0.0.1", 1935),
    tcp("127.0.0.1", 8889),
    cfg.SUPABASE_URL ? http(cfg.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/health") : Promise.resolve(null),
  ]);

  const health = coreHealth.body as { ok?: boolean; sls?: boolean; streams_live?: number } | undefined;
  const checks: Check[] = [
    { id: "site", name: "Site web", status: classify(site.ok, site.ms), ms: site.ok ? site.ms : null },
    {
      id: "core",
      name: "API Core",
      status: classify(coreHealth.ok && health?.ok !== false, coreHealth.ms),
      ms: coreHealth.ok ? coreHealth.ms : null,
      detail: typeof health?.streams_live === "number" ? `${health.streams_live} flux en direct` : undefined,
    },
    {
      id: "relay",
      name: "Relais SRT / SRTLA",
      // Le Core joint le SLS : sa santé dit si le relais répond.
      status: !coreHealth.ok ? "down" : health?.sls ? "up" : "down",
      ms: null,
    },
    { id: "rtmp", name: "Entrée RTMP", status: classify(rtmp.ok, rtmp.ms), ms: rtmp.ok ? rtmp.ms : null },
    { id: "cam", name: "SYXTEE Cam (WebRTC)", status: classify(whip.ok, whip.ms), ms: whip.ok ? whip.ms : null },
  ];
  if (db) checks.push({ id: "db", name: "Base de données", status: classify(db.ok, db.ms), ms: db.ok ? db.ms : null });
  return checks;
}

export const STATUS_ICON: Record<Status, string> = { up: "🟢", slow: "🟠", down: "🔴" };
export const STATUS_LABEL: Record<Status, string> = { up: "En ligne", slow: "Lent", down: "Hors ligne" };

/** Données du VPS et des directs, via les routes admin du Core. null si le jeton manque ou si le Core ne répond pas. */
export async function coreAdmin<T>(cfg: Config, path: string): Promise<T | null> {
  if (!cfg.CORE_API_TOKEN) return null;
  try {
    const res = await fetch(cfg.CORE_URL.replace(/\/$/, "") + path, {
      headers: { Authorization: `Bearer ${cfg.CORE_API_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
