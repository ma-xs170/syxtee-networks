import { save, type LinkConfig } from "./config.ts";

/** Jetons reçus du Core : accès (1 h) et renouvellement. Un ancien jeton long n'a ni l'un ni l'autre (`expires` = 0). */
export type Tokens = { token: string; refresh?: string; expires_in?: number };

export function setTokens(cfg: LinkConfig, t: Tokens) {
  cfg.token = t.token;
  cfg.refresh = t.refresh ?? "";
  cfg.expires = t.refresh && t.expires_in ? Date.now() + t.expires_in * 1000 : 0;
}

/** Renouvelle les jetons : "ok", "revoked" (refus du Core : il faut se reconnecter) ou "offline" (réessayer plus tard). */
export async function refreshTokens(cfg: LinkConfig): Promise<"ok" | "revoked" | "offline"> {
  if (!cfg.refresh) return "revoked";
  const res = await fetch(`${cfg.core}/v1/link/token/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh: cfg.refresh }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res) return "offline";
  if (res.status === 401) return "revoked";
  const j = (await res.json().catch(() => ({}))) as Partial<Tokens>;
  if (!res.ok || !j.token) return "offline";
  setTokens(cfg, { token: j.token, refresh: j.refresh, expires_in: j.expires_in });
  save(cfg);
  return "ok";
}

/** Jeton d'accès valable : renouvelé s'il expire dans moins d'une minute. Renvoie celui de la config si le renouvellement échoue. */
export async function freshToken(cfg: LinkConfig): Promise<string> {
  if (cfg.expires && cfg.refresh && Date.now() > cfg.expires - 60_000) await refreshTokens(cfg);
  return cfg.token;
}
