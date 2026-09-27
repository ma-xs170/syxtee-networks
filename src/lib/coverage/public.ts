import "server-only";
import { createClient } from "@supabase/supabase-js";
import { hasSupabase, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

// Lecture publique de la carte de couverture (clé publique, sans cookies : réponses cachables).
// Seuls les hexagones publiés (≥ 3 contributeurs ou ≥ 20 mesures) sont lisibles (RLS).

export type HexRow = {
  h3_index: string;
  operator: string;
  tech: string;
  median_kbps: number | null;
  p10_kbps: number | null;
  rtt_ms: number | null;
  loss_pct: number | null;
  n: number;
  contributors: number;
  last_ts: string;
  score: "bonne" | "moyenne" | "mauvaise" | "inconnue";
  freshness: number;
};
export type CoverageStats = { hexes: number; km2: number; measurements: number; contributors: number };

const HEX_COLUMNS = "h3_index, operator, tech, median_kbps, p10_kbps, rtt_ms, loss_pct, n, contributors, last_ts, score, freshness";
const client = () => createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

export async function publishedHexes(sinceDays = 365): Promise<HexRow[]> {
  if (!hasSupabase) return [];
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const { data, error } = await client().from("coverage_hex").select(HEX_COLUMNS).gte("last_ts", since).limit(50_000);
  if (error) {
    console.error("coverage_hex", error.message);
    return [];
  }
  return (data ?? []) as HexRow[];
}

export async function hexesAt(cells: string[]): Promise<HexRow[]> {
  if (!hasSupabase || !cells.length) return [];
  const { data, error } = await client().from("coverage_hex").select(HEX_COLUMNS).in("h3_index", cells);
  if (error) return [];
  return (data ?? []) as HexRow[];
}

export async function coverageStats(): Promise<CoverageStats> {
  const empty = { hexes: 0, km2: 0, measurements: 0, contributors: 0 };
  if (!hasSupabase) return empty;
  const { data, error } = await client().rpc("coverage_stats");
  if (error) return empty;
  return { ...empty, ...(data as CoverageStats) };
}

/** Meilleur opérateur d'un hexagone (débit médian le plus haut, toutes technos confondues si besoin). */
export function best(rows: HexRow[]) {
  return rows
    .filter((r) => r.operator !== "*" && r.operator !== "inconnu" && r.median_kbps)
    .sort((a, b) => (b.median_kbps ?? 0) - (a.median_kbps ?? 0))[0] ?? null;
}
