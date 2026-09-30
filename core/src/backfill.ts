import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregate, layerOf, MAX_ACCURACY_M, type HexAggregate } from "./aggregate.ts";
import { cellsOf, deviceHash, type ContributionRow } from "./coverage.ts";
import { classify, declaredName, isCaribbean, type Declared, type LinkClass } from "./link.ts";

// Re-traitement des mesures déjà collectées avec les règles en vigueur (lancé une fois au démarrage du Core) :
// hexagones rés. 8/9/10, reclassement Wi-Fi / cellulaire, contributions reconstruites (le Wi-Fi ne rapporte rien),
// puis recalcul complet de la carte (publication dès 1 contributeur).
// v3 : table ASN des Antilles-Guyane, Relais privé iCloud (ASN Apple / Cloudflare / Akamai / Fastly) et opérateur
// déclaré par le compte. Les anciennes mesures n'ont gardé ni IP ni connection.type (par choix) : ASN, nom
// d'opérateur et déclaration tranchent. Un ASN manquant est déduit des autres mesures du même appareil et du même
// opérateur (même mois), s'il est unique.

export const BACKFILL_KEY = "backfill_v3";

export type RawRow = {
  id: number;
  ts: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  operator: string | null;
  asn: number | null;
  link_type: string;
  link_conf: number;
  coarse: boolean;
  up_kbps: number | null;
  device_hash: string;
};
export type BackfillUpdate = {
  id: number;
  h3_8: string;
  h3_9: string | null;
  h3_10: string | null;
  link_type: string;
  link_conf: number;
  operator: string | null;
  asn: number | null;
  tags: string[];
};
/** Pourquoi une mesure reste hors de la carte 4G/5G après le backfill. */
export type UnknownWhy = "private_relay" | "mixed_asn_no_declaration" | "no_asn" | "unknown_asn";
export type BackfillReport = {
  total: number;
  kept: number;
  wifi: number;
  starlink: number;
  unknown: number;
  imprecise: number;
  /** Mesures de type inconnu avant, identifiées 4G/5G après. */
  unknown_to_cellular: number;
  /** Encore inconnues, par raison. */
  unknown_why: Partial<Record<UnknownWhy, number>>;
  /** Mesures 4G/5G par opérateur après le backfill. */
  operators: Record<string, number>;
  hexes: number;
  contributions: number;
  at: string;
};

export type BackfillDb = {
  raw(): Promise<RawRow[]>;
  update(rows: BackfillUpdate[]): Promise<void>;
  users(): Promise<string[]>;
  /** Opérateur déclaré par compte (profiles.mobile_operator). */
  declared(): Promise<Map<string, Declared>>;
  replaceContributions(rows: ContributionRow[]): Promise<void>;
  getMeta(key: string): Promise<unknown>;
  setMeta(key: string, value: unknown): Promise<void>;
};

/** Reclassement d'une ancienne mesure (sans IP ni type de connexion enregistrés). */
export function reclassify(r: Pick<RawRow, "link_type" | "link_conf" | "operator" | "asn">, declared: Declared | null = null): LinkClass {
  // Wi-Fi ou 4G/5G dit par le téléphone lui-même (Android, confiance 0,95) : on garde.
  if (r.link_conf >= 0.95 && (r.link_type === "wifi" || r.link_type === "cellular")) return { link_type: r.link_type, conf: r.link_conf };
  if (r.link_type === "wifi") return { link_type: "wifi", conf: 0.95 };
  if (r.link_type === "starlink") return { link_type: "starlink", conf: 0.9 };
  return classify({ asn: r.asn, asName: r.operator, operator: r.operator, declared });
}

/** Raison pour laquelle une mesure reste inconnue. */
export function unknownWhy(r: Pick<RawRow, "asn" | "operator">, link: LinkClass): UnknownWhy {
  if (link.tags?.includes("private_relay")) return "private_relay";
  if (link.conf === 0.4) return "mixed_asn_no_declaration";
  return r.asn === null ? "no_asn" : "unknown_asn";
}

/** ASN manquant : celui des autres mesures du même appareil (même mois) et du même opérateur, s'il est unique. */
export function inferAsns(rows: RawRow[]) {
  const seen = new Map<string, Set<number>>();
  for (const r of rows) {
    if (r.asn === null || !r.operator) continue;
    const k = `${r.device_hash}|${r.operator}`;
    (seen.get(k) ?? seen.set(k, new Set()).get(k)!).add(r.asn);
  }
  const out = new Map<number, number>();
  for (const r of rows) {
    if (r.asn !== null || !r.operator) continue;
    const s = seen.get(`${r.device_hash}|${r.operator}`);
    if (s?.size === 1) out.set(r.id, [...s][0]);
  }
  return out;
}

/** Calcul pur du backfill : mises à jour, contributions reconstruites et chiffres. */
export function planBackfill(rows: RawRow[], userIds: string[], salt: string, now = Date.now(), declaredBy: Map<string, Declared> = new Map()) {
  const updates: BackfillUpdate[] = [];
  const report = {
    total: rows.length,
    kept: 0,
    wifi: 0,
    starlink: 0,
    unknown: 0,
    imprecise: 0,
    unknown_to_cellular: 0,
    unknown_why: {} as Partial<Record<UnknownWhy, number>>,
    operators: {} as Record<string, number>,
  };
  const inferred = inferAsns(rows);
  // device_hash → compte : on recalcule l'identifiant de chaque compte pour chaque mois présent.
  const months = [...new Set(rows.map((r) => r.ts.slice(0, 7)))];
  const owner = new Map<string, string>();
  for (const u of userIds) for (const m of months) owner.set(deviceHash(salt, u, Date.parse(`${m}-15T00:00:00Z`)), u);
  const contrib = new Map<string, ContributionRow>();

  for (const r of rows) {
    const user = owner.get(r.device_hash);
    const declared = user ? (declaredBy.get(user) ?? null) : null;
    const asn = r.asn ?? inferred.get(r.id) ?? null;
    const link = reclassify({ ...r, asn }, declared);
    const tags = [...(link.tags ?? []), ...(r.asn === null && asn !== null ? ["asn_inferred"] : [])];
    const operator = link.tags?.includes("private_relay") ? (link.tags.includes("declared") ? declaredName(declared, isCaribbean(r.lat, r.lng)) : null) : r.operator;
    // Point des 60 premières secondes : rés. 8 seulement (sa position est déjà le centre de l'hexagone).
    const full = cellsOf(r.lat, r.lng);
    const cells = r.coarse ? { h3_8: full.h3_8, h3_9: null, h3_10: null } : full;
    updates.push({ id: r.id, ...cells, link_type: link.link_type, link_conf: link.conf, operator, asn, tags });
    const precise = r.accuracy_m !== null && r.accuracy_m <= MAX_ACCURACY_M;
    const layer = layerOf({ link_type: link.link_type, link_conf: link.conf });
    const counts = layer === "cellular";
    if (r.link_type === "unknown" && counts) report.unknown_to_cellular++;
    if (link.link_type === "wifi" || link.link_type === "fixed") report.wifi++;
    else if (link.link_type === "starlink") report.starlink++;
    else if (!counts) {
      report.unknown++;
      const why = unknownWhy({ asn, operator: r.operator }, link);
      report.unknown_why[why] = (report.unknown_why[why] ?? 0) + 1;
    } else if (!precise) report.imprecise++;
    else report.kept++;
    if (counts) report.operators[operator ?? "?"] = (report.operators[operator ?? "?"] ?? 0) + 1;
    if (!user || !precise || !cells.h3_9 || !layer) continue;
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
      operator: updates[i].operator,
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
  const plan = planBackfill(rows, await db.users(), opts.salt, Date.now(), await db.declared());
  for (let i = 0; i < plan.updates.length; i += 500) await db.update(plan.updates.slice(i, i + 500));
  await db.replaceContributions(plan.contributions);
  await opts.aggregateAll();
  const report: BackfillReport = { ...plan.report, contributions: plan.contributions.length, at: new Date().toISOString() };
  await db.setMeta(BACKFILL_KEY, report);
  log(
    `couverture, backfill v3 : ${report.total} mesures, ${report.kept} gardées sur la carte 4G/5G (${report.unknown_to_cellular} étaient inconnues), ` +
      `${report.wifi} écartées en Wi-Fi, ${report.starlink} Starlink, ${report.unknown} encore inconnues ${JSON.stringify(report.unknown_why)}, ` +
      `${report.imprecise} trop imprécises (> ${MAX_ACCURACY_M} m), ${report.hexes} hexagones publiés`,
  );
  return report;
}

/** Un compte vient de déclarer son opérateur : ses mesures encore hors carte (4 derniers mois) sont reclassées. */
export async function reclassUser(o: {
  db: Pick<BackfillDb, "update"> & { rowsOf(hashes: string[]): Promise<RawRow[]>; insertContributions(rows: ContributionRow[]): Promise<void> };
  salt: string;
  userId: string;
  declared: Declared | null;
  touch: (h3_8: string) => void;
  now?: number;
}) {
  const t = o.now ?? Date.now();
  const d = new Date(t);
  const hashes = [...new Set([0, 1, 2, 3, 4].map((m) => deviceHash(o.salt, o.userId, Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - m, 15))))];
  const rows = (await o.db.rowsOf(hashes)).filter((r) => !layerOf({ link_type: r.link_type, link_conf: r.link_conf }));
  if (!rows.length) return 0;
  const plan = planBackfill(rows, [o.userId], o.salt, t, new Map(o.declared ? [[o.userId, o.declared]] : []));
  await o.db.update(plan.updates);
  if (plan.contributions.length) await o.db.insertContributions(plan.contributions);
  for (const u of plan.updates) if (layerOf({ link_type: u.link_type, link_conf: u.link_conf })) o.touch(u.h3_8);
  return plan.report.unknown_to_cellular;
}

export function supabaseBackfillDb(db: SupabaseClient): BackfillDb & Parameters<typeof reclassUser>[0]["db"] {
  return {
    async raw() {
      const out: RawRow[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db
          .from("measurements")
          .select("id, ts, lat, lng, accuracy_m, operator, asn, link_type, link_conf, coarse, up_kbps, device_hash")
          .order("id")
          .range(from, from + 999);
        if (error) throw new Error(`measurements : ${error.message}`);
        out.push(...((data ?? []) as RawRow[]));
        if (!data || data.length < 1000) return out;
      }
    },
    async rowsOf(hashes) {
      const { data, error } = await db
        .from("measurements")
        .select("id, ts, lat, lng, accuracy_m, operator, asn, link_type, link_conf, coarse, up_kbps, device_hash")
        .in("device_hash", hashes)
        .limit(10_000);
      if (error) throw new Error(`measurements : ${error.message}`);
      return (data ?? []) as RawRow[];
    },
    async insertContributions(rows) {
      const { error } = await db.from("contributions").insert(rows);
      if (error) throw new Error(`contributions : ${error.message}`);
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
    async declared() {
      const out = new Map<string, Declared>();
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from("profiles").select("id, mobile_operator").not("mobile_operator", "is", null).order("id").range(from, from + 999);
        if (error) throw new Error(`profiles : ${error.message}`);
        for (const r of data ?? []) out.set(r.id as string, r.mobile_operator as Declared);
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
