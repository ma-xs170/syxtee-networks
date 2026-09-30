import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_ACCURACY_M } from "./aggregate.ts";
import type { Asn } from "./asn.ts";
import type { ContributionRow, PendingCtx } from "./coverage.ts";
import { classify, countsOnMap, declaredName, ipPrefix, type LinkType, type Prefixes } from "./link.ts";
import type { PrivateRelay } from "./privaterelay.ts";

// File de reclassement : mesures prises quand la base IPinfo manquait (jeton absent, téléchargement échoué).
// Toutes les 10 minutes, dès que la base est là, chaque mesure est reclassée avec son IP puis l'IP est effacée.
// Au bout de 14 jours sans base, on tranche sans ASN (opérateur déclaré, sinon inconnu) et l'IP est effacée aussi :
// aucune mesure ne reste « inconnue » faute d'avoir essayé, et aucune IP n'est gardée plus longtemps.

export const PENDING_MAX_MS = 14 * 86_400_000;

export type PendingItem = {
  measurement_id: number;
  user_id: string;
  ip: string;
  ctx: PendingCtx;
  created_at: string;
  m: { ts: string; h3_8: string | null; h3_9: string | null; accuracy_m: number | null } | null;
};
export type Reclassified = { id: number; operator: string | null; asn: number | null; link_type: string; link_conf: number; tags: string[] };

export type PendingDb = {
  list(limit: number): Promise<PendingItem[]>;
  update(rows: Reclassified[]): Promise<void>;
  remove(ids: number[]): Promise<void>;
  insertContributions(rows: ContributionRow[]): Promise<void>;
};

/** Reclassement pur d'une mesure en attente. null : on attend encore la base. */
export function reclassOne(p: PendingItem, asn: Pick<Asn, "lookup" | "ready">, relay: Pick<PrivateRelay, "has"> | undefined, prefixes: Prefixes | undefined, now: number): Reclassified | null {
  const expired = now - Date.parse(p.created_at) > PENDING_MAX_MS;
  const isRelay = relay?.has(p.ip) ?? false;
  const info = asn.lookup(p.ip);
  if (info.failed && !isRelay && !expired) return null;
  const link = classify({
    device: p.ctx.ct,
    asn: info.asn,
    asName: info.asName,
    operator: info.operator,
    prefix: prefixes?.get(ipPrefix(p.ip)),
    switched: p.ctx.switched,
    relay: isRelay,
    declared: p.ctx.declared,
  });
  const declared = link.tags?.includes("declared") && (!info.operator || isRelay);
  return {
    id: p.measurement_id,
    operator: declared ? declaredName(p.ctx.declared, p.ctx.caribbean) : isRelay ? null : info.operator,
    asn: isRelay ? null : info.asn,
    link_type: link.link_type,
    link_conf: link.conf,
    tags: link.tags ?? [],
  };
}

export async function runPending(o: {
  db: PendingDb;
  asn: Pick<Asn, "lookup" | "ready">;
  relay?: Pick<PrivateRelay, "has">;
  prefixes?: Prefixes;
  touch: (h3_8: string) => void;
  log: (m: string) => void;
  now?: number;
}) {
  const now = o.now ?? Date.now();
  const items = await o.db.list(1000);
  const done: Reclassified[] = [];
  const contrib: ContributionRow[] = [];
  for (const p of items) {
    if (!p.m) continue; // mesure purgée : la ligne part avec (on delete cascade)
    const r = reclassOne(p, o.asn, o.relay, o.prefixes, now);
    if (!r) continue;
    done.push(r);
    const counted = countsOnMap({ link_type: r.link_type as LinkType, conf: r.link_conf });
    if (counted && p.m.h3_9 && p.m.accuracy_m !== null && p.m.accuracy_m <= MAX_ACCURACY_M) contrib.push({ user_id: p.user_id, h3_index: p.m.h3_9, ts: p.m.ts, n: 1 });
    if (counted && p.m.h3_8) o.touch(p.m.h3_8);
  }
  if (!done.length) return 0;
  await o.db.update(done);
  if (contrib.length) await o.db.insertContributions(contrib);
  await o.db.remove(done.map((r) => r.id));
  o.log(`couverture : ${done.length} mesure(s) en attente reclassée(s), ${contrib.length} comptée(s) sur la carte`);
  return done.length;
}

export function supabasePendingDb(db: SupabaseClient): PendingDb {
  return {
    async list(limit) {
      const { data, error } = await db
        .from("measurement_pending")
        .select("measurement_id, user_id, ip, ctx, created_at, m:measurements(ts, h3_8, h3_9, accuracy_m)")
        .order("created_at")
        .limit(limit);
      if (error) throw new Error(`measurement_pending : ${error.message}`);
      return (data ?? []) as unknown as PendingItem[];
    },
    async update(rows) {
      for (const r of rows) {
        const { error } = await db
          .from("measurements")
          .update({ operator: r.operator, asn: r.asn, link_type: r.link_type, link_conf: r.link_conf, tags: r.tags })
          .eq("id", r.id);
        if (error) throw new Error(`measurements : ${error.message}`);
      }
    },
    async remove(ids) {
      const { error } = await db.from("measurement_pending").delete().in("measurement_id", ids);
      if (error) throw new Error(`measurement_pending : ${error.message}`);
    },
    async insertContributions(rows) {
      const { error } = await db.from("contributions").insert(rows);
      if (error) throw new Error(`contributions : ${error.message}`);
    },
  };
}
