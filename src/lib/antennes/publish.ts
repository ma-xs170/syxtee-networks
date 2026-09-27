import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAll, type TerritoryFile } from "./build.ts";

// Publie les fichiers de la carte des antennes dans le bucket public « open-data » (antennes/<territoire>.json).

export const BUCKET = "open-data";
export const PREFIX = "antennes";

export async function publishAntennes(admin: SupabaseClient, fetchImpl: typeof fetch = fetch) {
  const files = await buildAll(fetchImpl);
  const summary: { territory: string; sites: number; outages: number; bytes: number }[] = [];
  for (const f of files) {
    const body = JSON.stringify(f satisfies TerritoryFile);
    const { error } = await admin.storage.from(BUCKET).upload(`${PREFIX}/${f.territory}.json`, body, {
      contentType: "application/json",
      cacheControl: "3600",
      upsert: true,
    });
    if (error) throw new Error(`Envoi ${f.territory} : ${error.message}`);
    summary.push({ territory: f.territory, sites: f.sites.length, outages: Object.keys(f.outages).length, bytes: body.length });
  }
  return { quarter: files[0]?.sitesQuarter, statusDate: files[0]?.statusDate, summary };
}
