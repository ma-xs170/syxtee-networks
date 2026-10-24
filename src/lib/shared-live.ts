import "server-only";
import { stability, TOKEN_RE, type Stability } from "@/lib/live-report";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Lecture publique d'un direct partagé : uniquement par son jeton secret, et seulement des chiffres (jamais le relais, l'appareil ni le compte).

export type SharedLive = { started_at: string; ended_at: string; duration_s: number; avg_kbps: number; peak_kbps: number; reconnects: number; bitrate_series: number[]; stability: Stability | null };

export async function getSharedLive(token: string): Promise<SharedLive | null> {
  if (!TOKEN_RE.test(token) || !hasAdmin) return null;
  const { data } = await createAdminClient()
    .from("live_sessions")
    .select("started_at, ended_at, duration_s, avg_kbps, peak_kbps, reconnects, bitrate_series")
    .eq("share_token", token)
    .not("ended_at", "is", null)
    .maybeSingle();
  if (!data) return null;
  const s = data as Omit<SharedLive, "stability" | "ended_at"> & { ended_at: string };
  return { ...s, stability: stability(s) };
}
