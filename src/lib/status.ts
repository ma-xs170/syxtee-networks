import "server-only";
import { publicCoreUrl } from "@/lib/core";
import { supabaseUrl } from "@/lib/supabase/env";

// Sondes de la page d'état, mesurées depuis le serveur du site. Le relais SRT / SRTLA est jugé par le Core (il joint le SLS).

export type Status = "up" | "slow" | "down";
export type Service = { id: string; name: string; desc: string; status: Status; ms: number | null; detail?: string };

const SLOW_MS = 1500;

async function probe(url: string): Promise<{ ok: boolean; ms: number; body?: unknown }> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    const ms = Math.round(performance.now() - t0);
    // Toute réponse < 500 prouve que le service répond (Supabase renvoie 401 sans clé).
    const body = res.headers.get("content-type")?.includes("json") ? await res.json().catch(() => undefined) : undefined;
    return { ok: res.status < 500, ms, body };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - t0) };
  }
}

const classify = (ok: boolean, ms: number): Status => (!ok ? "down" : ms > SLOW_MS ? "slow" : "up");

export async function getServices(): Promise<Service[]> {
  const [core, db] = await Promise.all([
    publicCoreUrl ? probe(`${publicCoreUrl}/health`) : Promise.resolve(null),
    supabaseUrl ? probe(`${supabaseUrl}/auth/v1/health`) : Promise.resolve(null),
  ]);
  const health = core?.body as { ok?: boolean; sls?: boolean; streams_live?: number } | undefined;
  const coreUp = !!core?.ok && health?.ok !== false;
  const list: Service[] = [
    // Cette page est servie par le site : s'il répond ici, il est en ligne.
    { id: "site", name: "Site web", desc: "syxtee-networks.fr et l'espace client", status: "up", ms: null },
    {
      id: "core",
      name: "API Core",
      desc: "Dashboard, contrôle à distance, enregistrements",
      status: core ? classify(coreUp, core.ms) : "down",
      ms: core?.ok ? core.ms : null,
      detail: typeof health?.streams_live === "number" ? `${health.streams_live} flux en direct` : undefined,
    },
    {
      id: "relay",
      name: "Relais SRT / SRTLA",
      desc: "Réception de ton flux depuis le téléphone",
      status: coreUp && health?.sls ? "up" : "down",
      ms: null,
    },
  ];
  if (db) list.push({ id: "db", name: "Comptes et base de données", desc: "Connexion et données du compte", status: classify(db.ok, db.ms), ms: db.ok ? db.ms : null });
  return list;
}

export const overall = (s: Service[]): "ok" | "unstable" | "offline" => (s.every((x) => x.status === "up") ? "ok" : s.some((x) => x.status === "down") ? "offline" : "unstable");
