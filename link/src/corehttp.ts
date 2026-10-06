import type { LinkConfig } from "./config.ts";
import { freshToken, refreshTokens } from "./tokens.ts";

/** Appel du serveur SYXTEE avec le jeton de cet appareil (renouvelé au besoin, une relance si le Core répond 401). */
export async function coreCall(cfg: LinkConfig, method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await freshToken(cfg);
    const res = await fetch(`${cfg.core}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!res) return { ok: false, status: 0, json: {} };
    if (res.status === 401 && attempt === 0 && cfg.refresh && (await refreshTokens(cfg)) === "ok") continue;
    return { ok: res.ok, status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  }
  return { ok: false, status: 401, json: {} };
}
