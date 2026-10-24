import "server-only";
import { headers } from "next/headers";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

/** IP du visiteur (Vercel renseigne x-forwarded-for). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Vrai si l'action est autorisée (max `max` par fenêtre de `windowSeconds`). Compteurs dans Postgres. */
export async function allow(key: string, max: number, windowSeconds: number) {
  if (!hasAdmin || process.env.E2E_NO_RATE_LIMIT === "1") return true; // le second : tests e2e uniquement (30 connexions par IP et par 15 min les bloquent)
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("rate_limit_hit", error.message);
    return true;
  }
  return data === true;
}
