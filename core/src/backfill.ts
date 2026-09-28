import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregate, layerOf, MAX_ACCURACY_M, type HexAggregate } from "./aggregate.ts";
import { cellsOf, deviceHash, type ContributionRow } from "./coverage.ts";
import { asnClass, type LinkClass } from "./link.ts";

// Re-traitement des mesures déjà collectées avec les règles de la v2 (lancé une fois au démarrage du Core) :
// hexagones rés. 8/9/10, reclassement Wi-Fi / cellulaire, contributions reconstruites (le Wi-Fi ne rapporte rien),
// puis recalcul complet de la carte (publication dès 1 contributeur).
// Les anciennes mesures n'ont gardé ni IP ni connection.type (par choix) : seul le nom d'opérateur peut encore trancher.

export const BACKFILL_KEY = "backfill_v2";

export type RawRow = {
  id: number;
  ts: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  operator: string | null;
  link_type: string;
  up_kbps: number | null;
  device_hash: string;
};
export type BackfillUpdate = { id: number; h3_8: string; h3_9: string; h3_10: string; link_type: string; link_conf: number };
export type BackfillReport = {
  total: number;
  kept: number;
  wifi: number;
  starlink: number;
  unknown: number;
  imprecise: number;
  hexes: number;
  contributions: number;
  at: string;
};

export type BackfillDb = {
  raw(): Promise<RawRow[]>;
  update(rows: BackfillUpdate[]): Promise<void>;
  users(): Promise<string[]>;
  replaceContributions(rows: ContributionRow[]): Promise<void>;
  getMeta(key: string): Promise<unknown>;
  setMeta(key: string, value: unknown): Promise<void>;
};

/** Reclassement d'une ancienne mesure (sans IP ni type de connexion enregistrés). */
export function reclassify(r: Pick<RawRow, "link_type" | "operator">): LinkClass {
  if (r.link_type === "wifi") return { link_type: "wifi", conf: 0.95 };
  if (r.link_type === "starlink") return { link_type: "starlink", conf: 0.9 };
  const c = asnClass(null, r.operator);
  if (c === "satellite") return { link_type: "starlink", conf: 0.9 };
  if (c === "fixed") return { link_type: "fixed", conf: 0.85 };
  if (c === "mobile") return { link_type: "cellular", conf: 0.85 };
  return { link_type: "unknown", conf: 0.2 };
}

/** Calcul pur du backfill : mises à jour, contributions reconstruites et chiffres. */
export function planBackfill(rows: RawRow[], userIds: string[], salt: string, now = Date.now()) {
  const updates: BackfillUpdate[] = [];
  const report = { total: rows.length, kept: 0, wifi: 0, starlink: 0, unknown: 0, imprecise: 0 };
  // device_hash → compte : on recalcule l'identifiant de chaque compte pour chaque mois présent.
  const months = [...new Set(rows.map((r) => r.ts.slice(0, 7)))];
  const owner = new Map<string, string>();
  for (const u of userIds) for (const m of months) owner.set(deviceHash(salt, u, Date.parse(`${m}-15T00:00:00Z`)), u);
  const contrib = new Map<string, ContributionRow>();

  for (const r of rows) {
    const link = reclassify(r);
    const cells = cellsOf(r.lat, r.lng);
    updates.push({ id: r.id, ...cells, link_type: link.link_type, link_conf: link.conf });
    const precise = r.accuracy_m !== null && r.accuracy_m <= MAX_ACCURACY_M;
    if (link.link_type === "wifi" || link.link_type === "fixed") report.wifi++;
    else if (link.link_type === "starlink") report.starlink++;
    else if (link.link_type === "unknown" || !layerOf({ link_type: link.link_type, link_conf: link.conf })) report.unknown++;
    else if (!precise) report.imprecise++;
    else report.kept++;
    const user = owner.get(r.device_hash);
    if (!user || !precise || !layerOf({ link_type: link.link_type, link_conf: link.conf })) continue;
    const k = `${user}:${cells.h3_9}:${r.ts.slice(0, 10)}`;
    const c = contrib.get(k);
    if (c) c.n++;
    else contrib.set(k, { user_id: user, h3_index: cells.h3_9, ts: r.ts, n: 1 });
  }

  const hexes: HexAggregate[] = aggregate(
    rows.map((r, i) => ({
      ts: r.ts,
      lng: r.lng,
      accuracy_m: r.accuracy_m,
      h3_8: updates[i].h3_8,
      h3_9: updates[i].h3_9,
      h3_10: updates[i].h3_10,
      operator: r.operator,
      tech: "inconnu",
      link_type: updates[i].link_type,
      link_conf: updates[i].link_conf,
      up_kbps: r.up_kbps,
      down_kbps: null,
      rtt_ms: null,
      loss_pct: null,
      moving: false,
      device_hash: r.device_hash,
    })),
    now,
  );
  const published = hexes.filter((h) => h.res === 9 && h.layer === "cellular" && h.operator === "*" && h.mode === "all" && h.published).length;
  return { updates, contributions: [...contrib.values()], report: { ...report, hexes: published } };
}

/** Lance le backfill s'il n'a jamais tourné. `aggregateAll` recalcule ensuite toute la carte depuis la base. */
export async function runBackfill(opts: { db: BackfillDb; salt: string; aggregateAll: () => Promise<unknown>; log: (m: string) => void; force?: boolean }) {
  const { db, log } = opts;
  if (!opts.force && (await db.getMeta(BACKFILL_KEY))) return null;
  const rows = await db.raw();
  const plan = planBackfill(rows, await db.users(), opts.salt);
  for (let i = 0; i < plan.updates.length; i += 500) await db.update(plan.updates.slice(i, i + 500));
  await db.replaceContributions(plan.contributions);
  await opts.aggregateAll();
  const report: BackfillReport = { ...plan.report, contributions: plan.contributions.length, at: new Date().toISOString() };
  await db.setMeta(BACKFILL_KEY, report);
  log(
    `couverture, backfill v2 : ${report.total} mesures, ${report.kept} gardées sur la carte 4G/5G, ${report.wifi} écartées en Wi-Fi, ` +
      `${report.starlink} Starlink, ${report.unknown} de type inconnu, ${report.imprecise} trop imprécises (> ${MAX_ACCURACY_M} m), ${report.hexes} hexagones publiés`,
  );
  return report;
}

export function supabaseBackfillDb(db: SupabaseClient): BackfillDb {
  return {
    async raw() {
      const out: RawRow[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db
          .from("measurements")
          .select("id, ts, lat, lng, accuracy_m, operator, link_type, up_kbps, device_hash")
          .order("id")
          .range(from, from + 999);
        if (error) throw new Error(`measurements : ${error.message}`);
        out.push(...((data ?? []) as RawRow[]));
        if (!data || data.length < 1000) return out;
      }
    },
    async update(rows) {
      const { error } = await db.rpc("coverage_backfill_rows", { rows });
      if (error) throw new Error(`coverage_backfill_rows : ${error.message}`);
    },
    async users() {
      const out: string[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from("profiles").select("id").order("id").range(from, from + 999);
        if (error) throw new Error(`profiles : ${error.message}`);
        out.push(...(data ?? []).map((r) => r.id as string));
        if (!data || data.length < 1000) return out;
      }
    },
    async replaceContributions(rows) {
      const d = await db.from("contributions").delete().gte("id", 0);
      if (d.error) throw new Error(`contributions : ${d.error.message}`);
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db.from("contributions").insert(rows.slice(i, i + 500));
        if (error) throw new Error(`contributions : ${error.message}`);
      }
    },
    async getMeta(key) {
      const { data, error } = await db.from("coverage_meta").select("value").eq("key", key).maybeSingle();
      if (error) throw new Error(`coverage_meta : ${error.message}`);
      return data?.value ?? null;
    },
    async setMeta(key, value) {
      const { error } = await db.from("coverage_meta").upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw new Error(`coverage_meta : ${error.message}`);
    },
  };
}
