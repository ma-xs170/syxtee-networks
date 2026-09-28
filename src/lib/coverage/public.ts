import "server-only";
import { createClient } from "@supabase/supabase-js";
import { hasSupabase, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

// Lecture publique de la carte de couverture (clé publique, sans cookies : réponses cachables).
// Seuls les hexagones publiés (≥ 1 contributeur et ≥ 5 mesures valides) sont lisibles (RLS).
// Jamais de point, d'heure exacte ni d'identité : des agrégats par hexagone, dates au mois près avec un seul contributeur.

export type Reliability = "estimation" | "fiable" | "tres_fiable";
export type HexRow = {
  res: 8 | 9 | 10;
  h3_index: string;
  layer: "cellular" | "starlink";
  operator: string;
  tech: string;
  mode: "all" | "foot" | "vehicle";
  median_kbps: number | null;
  p10_kbps: number | null;
  down_kbps: number | null;
  rtt_ms: number | null;
  loss_pct: number | null;
  n: number;
  contributors: number;
  hours: number[];
  reliability: Reliability;
  score: "bonne" | "moyenne" | "mauvaise" | "inconnue";
  freshness: number;
  last_ts: string;
  first_month: string;
  last_month: string;
};
export type CoverageStats = { hexes: number; km2: number; measurements: number; contributors: number };

const HEX_COLUMNS =
  "res, h3_index, layer, operator, tech, mode, median_kbps, p10_kbps, down_kbps, rtt_ms, loss_pct, n, contributors, hours, reliability, score, freshness, last_ts, first_month, last_month";
const client = () => createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

export async function publishedHexes(sinceDays = 365): Promise<HexRow[]> {
  if (!hasSupabase) return [];
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const out: HexRow[] = [];
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await client().from("coverage_hex").select(HEX_COLUMNS).gte("last_ts", since).order("h3_index").range(from, from + 999);
    if (error) {
      console.error("coverage_hex", error.message);
      return out;
    }
    out.push(...((data ?? []) as HexRow[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Hexagones rés. 9 de la couche 4G/5G (tous modes confondus) à ces positions. */
export async function hexesAt(cells: string[]): Promise<HexRow[]> {
  if (!hasSupabase || !cells.length) return [];
  const { data, error } = await client().from("coverage_hex").select(HEX_COLUMNS).eq("res", 9).eq("layer", "cellular").eq("mode", "all").in("h3_index", cells);
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

/** Meilleur opérateur d'un hexagone (débit médian le plus haut). */
export function best(rows: HexRow[]) {
  return rows
    .filter((r) => r.operator !== "*" && r.operator !== "inconnu" && r.median_kbps)
    .sort((a, b) => (b.median_kbps ?? 0) - (a.median_kbps ?? 0))[0] ?? null;
}
