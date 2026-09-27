import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { latLngToCell } from "h3-js";

// Mesures de couverture pour la carte communautaire (table `measurements`, sans user_id).
// Règles appliquées ICI, côté Core (jamais seulement dans l'interface) :
// - rien n'est gardé sans le consentement « coverage_consent » du profil, revérifié juste avant chaque écriture ;
// - précision GPS > 50 m, vitesse > 250 km/h et points dans une zone privée : ignorés ;
// - les 300 premiers et 300 derniers mètres de chaque session ne sont jamais écrits
//   (un point n'est écrit qu'une fois qu'on s'en est éloigné de 300 m ; à la fin de la session, le reste est jeté).

export const MAX_ACCURACY_M = 50;
export const MAX_SPEED_KMH = 250;
export const TRIM_M = 300;
const SESSION_GAP_MS = 10 * 60_000;
const PREFS_TTL = 15_000;
export const H3_RES = 9;

export type Source = "live" | "scan" | "android";
export type Zone = { lat: number; lng: number; radius_m: number };
export type Prefs = { consent: boolean; zones: Zone[] };

export type Point = {
  t: number;
  lat: number;
  lng: number;
  acc: number | null;
  up_kbps: number | null;
  rtt_ms: number | null;
  loss_pct: number | null;
  operator: string | null;
  tech?: "4g" | "5g" | "inconnu";
  link_type?: "cell" | "wifi" | "starlink";
};

export type MeasurementRow = {
  ts: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  h3_index: string;
  operator: string | null;
  tech: string;
  link_type: string;
  up_kbps: number | null;
  rtt_ms: number | null;
  loss_pct: number | null;
  source: Source;
  device_hash: string;
};
export type ContributionRow = { user_id: string; h3_index: string; ts: string };

export type CoverageDb = {
  prefs(userId: string): Promise<Prefs>;
  insertMeasurements(rows: MeasurementRow[]): Promise<void>;
  insertContributions(rows: ContributionRow[]): Promise<void>;
  aggregate(): Promise<unknown>;
  /** Droit à l'effacement : mesures de ces identifiants d'appareil + contributions du compte. */
  erase(deviceHashes: string[], userId: string): Promise<number>;
};

/** Distance en mètres (haversine). */
export function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export const inZones = (p: { lat: number; lng: number }, zones: Zone[]) => zones.some((z) => distance(p, z) <= z.radius_m);

/** Pourcentage de paquets SRT perdus sur un intervalle (paquets de 1 316 octets). */
export function lossPct(dropped: number, kbps: number, intervalMs: number) {
  const sent = (kbps * 1000 * (intervalMs / 1000)) / 8 / 1316;
  return sent + dropped > 0 ? Math.round((dropped / (sent + dropped)) * 10_000) / 100 : 0;
}

/** Identifiant anonyme d'appareil : change chaque mois, impossible à relier à un compte sans le sel du Core. */
export function deviceHash(salt: string, userId: string, t: number) {
  const month = new Date(t).toISOString().slice(0, 7);
  return createHmac("sha256", salt).update(`${userId}:${month}`).digest("hex").slice(0, 24);
}

type Track = { start: Point | null; leftStart: boolean; last: Point | null; pending: Point[]; lastAt: number };

export function createCoverage(opts: { db: CoverageDb; salt: string; now?: () => number; log?: (m: string) => void }) {
  const { db, salt } = opts;
  const now = opts.now ?? Date.now;
  const log = opts.log ?? (() => {});
  const tracks = new Map<string, Track>(); // `${userId}:${source}`
  const prefsCache = new Map<string, { at: number; p: Prefs }>();
  const queue: { userId: string; row: MeasurementRow }[] = [];
  const contributed = new Set<string>(); // user:h3:jour, pour ne pas dupliquer les contributions
  const lastLive = new Map<string, number>();

  async function prefs(userId: string) {
    const c = prefsCache.get(userId);
    if (c && now() - c.at < PREFS_TTL) return c.p;
    const p = await db.prefs(userId);
    prefsCache.set(userId, { at: now(), p });
    return p;
  }

  function release(userId: string, source: Source, p: Point) {
    queue.push({
      userId,
      row: {
        ts: new Date(p.t).toISOString(),
        lat: Math.round(p.lat * 1e5) / 1e5, // ~1 m : suffisant pour l'hexagone, pas plus
        lng: Math.round(p.lng * 1e5) / 1e5,
        accuracy_m: p.acc,
        h3_index: latLngToCell(p.lat, p.lng, H3_RES),
        operator: p.operator,
        tech: p.tech ?? "inconnu",
        link_type: p.link_type ?? "cell",
        up_kbps: p.up_kbps === null ? null : Math.round(p.up_kbps),
        rtt_ms: p.rtt_ms === null ? null : Math.round(p.rtt_ms),
        loss_pct: p.loss_pct,
        source,
        device_hash: deviceHash(salt, userId, p.t),
      },
    });
  }

  /** Filtre un point et le met en attente. Renvoie la raison d'un refus, ou null s'il est retenu. */
  async function add(userId: string, source: Source, p: Point): Promise<string | null> {
    const key = `${userId}:${source}`;
    const pr = await prefs(userId);
    if (!pr.consent) {
      tracks.delete(key);
      return "no_consent";
    }
    let tr = tracks.get(key);
    if (!tr || p.t - tr.lastAt > SESSION_GAP_MS) {
      tr = { start: null, leftStart: false, last: null, pending: [], lastAt: p.t };
      tracks.set(key, tr);
    }
    tr.lastAt = p.t;
    if (p.acc === null || p.acc > MAX_ACCURACY_M) return "accuracy";
    if (inZones(p, pr.zones)) return "private_zone";
    if (tr.last && p.t > tr.last.t && (distance(tr.last, p) / ((p.t - tr.last.t) / 1000)) * 3.6 > MAX_SPEED_KMH) return "speed";
    tr.last = p;

    if (!tr.start) tr.start = p;
    if (!tr.leftStart) {
      if (distance(tr.start, p) < TRIM_M) return "trim";
      tr.leftStart = true;
    }
    // Fin de session inconnue d'avance : un point n'est libéré qu'une fois à 300 m derrière nous.
    tr.pending.push(p);
    while (tr.pending.length && distance(tr.pending[0], p) >= TRIM_M) release(userId, source, tr.pending.shift()!);
    return null;
  }

  return {
    add,

    /** Relevé de santé d'un flux en direct + dernière position connue (SYXTEE Cam). Au plus un point toutes les 2 s. */
    async live(userId: string, s: { t: number; bitrate: number; rtt: number; dropped: number }, pos: { t: number; lat: number; lon: number; acc: number | null } | null) {
      if (!pos || s.t - pos.t > 5000) return null;
      const prev = lastLive.get(userId) ?? 0;
      if (s.t - prev < 2000) return null;
      lastLive.set(userId, s.t);
      return add(userId, "live", {
        t: s.t,
        lat: pos.lat,
        lng: pos.lon,
        acc: pos.acc,
        up_kbps: s.bitrate,
        rtt_ms: s.rtt,
        loss_pct: lossPct(s.dropped, s.bitrate, prev ? s.t - prev : 2000),
        // TODO : opérateur par lien SRTLA (l'IP source de chaque lien n'est pas exposée par srtla-receiver).
        operator: null,
      });
    },

    /** Fin d'une session (direct terminé) : les derniers 300 m ne sont jamais écrits. */
    end(userId: string, source: Source) {
      tracks.delete(`${userId}:${source}`);
      if (source === "live") lastLive.delete(userId);
    },

    /** Consentement retiré ou zones modifiées : relire tout de suite. */
    forget(userId: string) {
      prefsCache.delete(userId);
    },

    /** Écrit les points en attente. Le consentement est relu SANS cache juste avant. */
    async flush() {
      if (!queue.length) return 0;
      const batch = queue.splice(0, queue.length);
      const users = [...new Set(batch.map((b) => b.userId))];
      const ok = new Set<string>();
      for (const u of users) {
        try {
          if ((await db.prefs(u)).consent) ok.add(u);
          else tracks.forEach((_, k) => k.startsWith(`${u}:`) && tracks.delete(k));
        } catch (e) {
          log(`couverture : consentement illisible (${(e as Error).message}), points ignorés`);
        }
      }
      const kept = batch.filter((b) => ok.has(b.userId));
      if (!kept.length) return 0;
      const contributions: ContributionRow[] = [];
      for (const { userId, row } of kept) {
        const k = `${userId}:${row.h3_index}:${row.ts.slice(0, 10)}`;
        if (contributed.has(k)) continue;
        contributed.add(k);
        contributions.push({ user_id: userId, h3_index: row.h3_index, ts: row.ts });
      }
      if (contributed.size > 100_000) contributed.clear();
      try {
        await db.insertMeasurements(kept.map((b) => b.row));
        if (contributions.length) await db.insertContributions(contributions);
      } catch (e) {
        log(`couverture : écriture impossible (${(e as Error).message})`);
        return 0;
      }
      return kept.length;
    },

    /** Efface toutes les mesures d'un compte (identifiants des 4 derniers mois : les mesures ont 90 jours au plus). */
    async erase(userId: string) {
      queue.splice(0, queue.length, ...queue.filter((q) => q.userId !== userId));
      tracks.forEach((_, k) => k.startsWith(`${userId}:`) && tracks.delete(k));
      const t = now();
      const hashes = [0, 1, 2, 3, 4].map((m) => deviceHash(salt, userId, Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() - m, 15)));
      return db.erase([...new Set(hashes)], userId);
    },

    /** Consentement actuel (sans cache), pour l'app /cam. */
    consent: async (userId: string) => (await db.prefs(userId)).consent,
    aggregate: () => db.aggregate(),
    pending: () => queue.length,
  };
}

export type Coverage = ReturnType<typeof createCoverage>;

/** Implémentation Supabase (clé secrète du Core). */
export function supabaseCoverageDb(db: SupabaseClient): CoverageDb {
  return {
    async prefs(userId) {
      const [p, z] = await Promise.all([
        db.from("profiles").select("coverage_consent").eq("id", userId).maybeSingle(),
        db.from("private_zones").select("lat, lng, radius_m").eq("user_id", userId),
      ]);
      if (p.error) throw new Error(p.error.message);
      if (z.error) throw new Error(z.error.message);
      return { consent: p.data?.coverage_consent === true, zones: (z.data ?? []) as Zone[] };
    },
    async insertMeasurements(rows) {
      const { error } = await db.from("measurements").insert(rows);
      if (error) throw new Error(`measurements : ${error.message}`);
    },
    async insertContributions(rows) {
      const { error } = await db.from("contributions").insert(rows);
      if (error) throw new Error(`contributions : ${error.message}`);
    },
    async erase(hashes, userId) {
      const m = await db.from("measurements").delete({ count: "exact" }).in("device_hash", hashes);
      if (m.error) throw new Error(`measurements : ${m.error.message}`);
      const c = await db.from("contributions").delete().eq("user_id", userId);
      if (c.error) throw new Error(`contributions : ${c.error.message}`);
      return m.count ?? 0;
    },
    async aggregate() {
      const { data, error } = await db.rpc("coverage_aggregate");
      if (error) throw new Error(`coverage_aggregate : ${error.message}`);
      return data;
    },
  };
}
