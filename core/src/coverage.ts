import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cellToLatLng, cellToParent, latLngToCell } from "h3-js";
import { aggregate, layerOf, MAX_ACCURACY_M, MOVING_KMH, type HexAggregate, type Measurement } from "./aggregate.ts";
import type { Declared, LinkClass } from "./link.ts";

// Mesures de couverture pour la carte communautaire (table `measurements`, sans user_id).
// Règles appliquées ICI, côté Core (jamais seulement dans l'interface) :
// - rien n'est gardé sans le consentement « coverage_consent » du profil, revérifié juste avant chaque écriture ;
// - aucune restriction géographique : tout pays, tout opérateur (un inconnu garde son ASN et son nom brut) ;
// - précision GPS > 20 m, vitesse > 250 km/h et points dans une zone privée : ignorés ;
// - la position exacte des 60 premières secondes de chaque session n'est pas publiée : le point est ramené
//   au centre de son hexagone de rés. 8 (~0,7 km²) et ne compte que pour la vue dézoomée ;
// - chaque mesure porte son type de lien (cellular / wifi / starlink / fixed / unknown) et sa confiance :
//   seul 'cellular' avec une confiance ≥ 0,7 alimente la carte 4G/5G, et rapporte des contributions.

export { MAX_ACCURACY_M };
export const MAX_SPEED_KMH = 250;
export const COARSE_MS = 60_000;
const SESSION_GAP_MS = 10 * 60_000;
const PREFS_TTL = 15_000;
const DAY = 86_400_000;

export type Source = "live" | "scan" | "android";
export type Zone = { lat: number; lng: number; radius_m: number };
export type Prefs = { consent: boolean; zones: Zone[]; declared?: Declared | null };
/** Contexte gardé avec l'IP d'une mesure à reclasser (base IPinfo indisponible au moment du scan). */
export type PendingCtx = { declared: Declared | null; ct: string | null; switched: boolean; caribbean: boolean };

export type Point = {
  t: number;
  lat: number;
  lng: number;
  acc: number | null;
  /** Vitesse GPS en km/h, si le téléphone la donne (sinon calculée entre deux points). */
  speed_kmh?: number | null;
  up_kbps: number | null;
  down_kbps?: number | null;
  rtt_ms: number | null;
  loss_pct: number | null;
  operator: string | null;
  asn?: number | null;
  tech?: "4g" | "5g" | "inconnu";
  link?: LinkClass;
  /** Base IPinfo indisponible : IP gardée le temps du reclassement (table measurement_pending). */
  pending?: { ip: string; ctx: PendingCtx };
};

export type MeasurementRow = {
  ts: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  h3_8: string;
  h3_9: string | null;
  h3_10: string | null;
  coarse: boolean;
  operator: string | null;
  asn: number | null;
  tech: string;
  link_type: string;
  link_conf: number;
  tags: string[];
  up_kbps: number | null;
  down_kbps: number | null;
  rtt_ms: number | null;
  loss_pct: number | null;
  speed_kmh: number | null;
  moving: boolean;
  source: Source;
  device_hash: string;
};
export type ContributionRow = { user_id: string; h3_index: string; ts: string; n: number };
export type PendingRow = { measurement_id: number; user_id: string; ip: string; ctx: PendingCtx };

export type CoverageDb = {
  prefs(userId: string): Promise<Prefs>;
  /** Renvoie les identifiants des lignes, dans l'ordre (nécessaires pour la file de reclassement). */
  insertMeasurements(rows: MeasurementRow[]): Promise<number[] | void>;
  insertPending?(rows: PendingRow[]): Promise<void>;
  insertContributions(rows: ContributionRow[]): Promise<void>;
  /** Purge des mesures et contributions de plus de 90 jours. */
  purge(): Promise<void>;
  /** Mesures des 90 derniers jours dans ces hexagones de rés. 8 (null = toutes). */
  measurements(parents8: string[] | null): Promise<Measurement[]>;
  /** Remplace les agrégats de ces hexagones de rés. 8 (null = toute la table). */
  writeHexes(rows: HexAggregate[], parents8: string[] | null): Promise<void>;
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

/** Hexagones d'un point : rés. 10, puis parents exacts en rés. 9 et 8 (même hiérarchie partout). */
export function cellsOf(lat: number, lng: number) {
  const h10 = latLngToCell(lat, lng, 10);
  return { h3_10: h10, h3_9: cellToParent(h10, 9), h3_8: cellToParent(h10, 8) };
}

const UNKNOWN: LinkClass = { link_type: "unknown", conf: 0.2 };
type Track = { startT: number; last: Point | null; lastAt: number };

export function createCoverage(opts: { db: CoverageDb; salt: string; now?: () => number; log?: (m: string) => void }) {
  const { db, salt } = opts;
  const now = opts.now ?? Date.now;
  const log = opts.log ?? (() => {});
  const tracks = new Map<string, Track>(); // `${userId}:${source}`
  const prefsCache = new Map<string, { at: number; p: Prefs }>();
  const queue: { userId: string; row: MeasurementRow; pending?: Point["pending"] }[] = [];
  const dirty = new Set<string>(); // hexagones de rés. 8 à recalculer
  const lastLive = new Map<string, number>();
  const liveLink = new Map<string, { operator: string | null; asn: number | null; link: LinkClass; at: number }>();

  async function prefs(userId: string) {
    const c = prefsCache.get(userId);
    if (c && now() - c.at < PREFS_TTL) return c.p;
    const p = await db.prefs(userId);
    prefsCache.set(userId, { at: now(), p });
    return p;
  }

  function release(userId: string, source: Source, p: Point, speed: number | null, coarse: boolean) {
    const link = p.link ?? UNKNOWN;
    let lat = p.lat;
    let lng = p.lng;
    let cells: { h3_8: string; h3_9: string | null; h3_10: string | null } = cellsOf(lat, lng);
    if (coarse) {
      // Début de session : la position exacte n'est jamais écrite, seulement le centre de l'hexagone de rés. 8.
      [lat, lng] = cellToLatLng(cells.h3_8);
      cells = { h3_8: cells.h3_8, h3_9: null, h3_10: null };
    }
    queue.push({
      userId,
      row: {
        ts: new Date(p.t).toISOString(),
        lat: Math.round(lat * 1e5) / 1e5, // ~1 m : suffisant pour l'hexagone, pas plus
        lng: Math.round(lng * 1e5) / 1e5,
        accuracy_m: p.acc,
        ...cells,
        coarse,
        operator: p.operator,
        asn: p.asn ?? null,
        tech: p.tech ?? "inconnu",
        link_type: link.link_type,
        link_conf: link.conf,
        tags: link.tags ?? [],
        up_kbps: p.up_kbps === null ? null : Math.round(p.up_kbps),
        down_kbps: p.down_kbps == null ? null : Math.round(p.down_kbps),
        rtt_ms: p.rtt_ms === null ? null : Math.round(p.rtt_ms),
        loss_pct: p.loss_pct,
        speed_kmh: speed === null ? null : Math.round(speed * 10) / 10,
        moving: (speed ?? 0) > MOVING_KMH,
        source,
        device_hash: deviceHash(salt, userId, p.t),
      },
      pending: p.pending,
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
      tr = { startT: p.t, last: null, lastAt: p.t };
      tracks.set(key, tr);
    }
    tr.lastAt = p.t;
    if (p.acc === null || p.acc > MAX_ACCURACY_M) return "accuracy";
    if (inZones(p, pr.zones)) return "private_zone";
    const computed = tr.last && p.t > tr.last.t ? (distance(tr.last, p) / ((p.t - tr.last.t) / 1000)) * 3.6 : null;
    if (computed !== null && computed > MAX_SPEED_KMH) return "speed";
    tr.last = p;
    release(userId, source, p, p.speed_kmh ?? computed, p.t - tr.startT < COARSE_MS);
    return null;
  }

  async function runAggregate(parents: string[] | null) {
    const rows = aggregate(await db.measurements(parents), now());
    await db.writeHexes(rows, parents);
    return rows;
  }

  return {
    add,

    /** Réseau vu par SYXTEE Cam pendant le direct (IP de /v1/cam/gps + connection.type), pour classer les points du live. */
    setLink(userId: string, info: { operator: string | null; asn: number | null; link: LinkClass }) {
      liveLink.set(userId, { ...info, at: now() });
    },

    /** Relevé de santé d'un flux en direct + dernière position connue (SYXTEE Cam). Au plus un point toutes les 2 s. */
    async live(
      userId: string,
      s: { t: number; bitrate: number; rtt: number; dropped: number },
      pos: { t: number; lat: number; lon: number; acc: number | null; speed?: number | null } | null,
    ) {
      if (!pos || s.t - pos.t > 5000) return null;
      const prev = lastLive.get(userId) ?? 0;
      if (s.t - prev < 2000) return null;
      lastLive.set(userId, s.t);
      const net = liveLink.get(userId);
      const fresh = net && now() - net.at < 60_000 ? net : null;
      return add(userId, "live", {
        t: s.t,
        lat: pos.lat,
        lng: pos.lon,
        acc: pos.acc,
        speed_kmh: pos.speed == null ? null : pos.speed * 3.6,
        up_kbps: s.bitrate,
        rtt_ms: s.rtt,
        loss_pct: lossPct(s.dropped, s.bitrate, prev ? s.t - prev : 2000),
        // TODO : un classement par lien SRTLA quand srtla-receiver exposera l'IP source de chaque lien.
        operator: fresh?.operator ?? null,
        asn: fresh?.asn ?? null,
        link: fresh?.link ?? UNKNOWN,
      });
    },

    /** Fin d'une session (direct terminé). */
    end(userId: string, source: Source) {
      tracks.delete(`${userId}:${source}`);
      if (source === "live") {
        lastLive.delete(userId);
        liveLink.delete(userId);
      }
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
      // Contributions : seulement les mesures qui comptent sur la carte (jamais le Wi-Fi), une ligne par compte, hexagone et jour.
      const contrib = new Map<string, ContributionRow>();
      for (const { userId, row } of kept) {
        if (!row.h3_9 || !layerOf(row)) continue;
        const k = `${userId}:${row.h3_9}:${row.ts.slice(0, 10)}`;
        const c = contrib.get(k);
        if (c) c.n++;
        else contrib.set(k, { user_id: userId, h3_index: row.h3_9, ts: row.ts, n: 1 });
      }
      try {
        const ids = await db.insertMeasurements(kept.map((b) => b.row));
        if (contrib.size) await db.insertContributions([...contrib.values()]);
        const pending = kept.flatMap((b, i) => (b.pending && ids?.[i] ? [{ measurement_id: ids[i], user_id: b.userId, ...b.pending }] : []));
        if (pending.length) await db.insertPending?.(pending);
      } catch (e) {
        log(`couverture : écriture impossible (${(e as Error).message})`);
        return 0;
      }
      for (const { row } of kept) if (layerOf(row)) dirty.add(row.h3_8);
      return kept.length;
    },

    /** Efface toutes les mesures d'un compte (identifiants des 4 derniers mois : les mesures ont 90 jours au plus). */
    async erase(userId: string) {
      queue.splice(0, queue.length, ...queue.filter((q) => q.userId !== userId));
      tracks.forEach((_, k) => k.startsWith(`${userId}:`) && tracks.delete(k));
      const t = now();
      const hashes = [0, 1, 2, 3, 4].map((m) => deviceHash(salt, userId, Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() - m, 15)));
      const n = await db.erase([...new Set(hashes)], userId);
      await runAggregate(null).catch((e) => log(`couverture : recalcul après effacement impossible (${(e as Error).message})`));
      return n;
    },

    /** Opérateur mobile déclaré par le compte (profil, cache de 15 s). */
    declared: async (userId: string) => (await prefs(userId)).declared ?? null,

    /** Hexagones à recalculer (mesure reclassée après coup). */
    touch(h3_8: string) {
      dirty.add(h3_8);
    },

    /** Consentement actuel (sans cache), pour l'app /cam. */
    consent: async (userId: string) => (await db.prefs(userId)).consent,

    /** Recalcul des hexagones touchés depuis le dernier passage ; `full` : purge 90 j et recalcul de toute la carte. */
    async aggregate(full = false) {
      if (full) {
        await db.purge();
        dirty.clear();
        return (await runAggregate(null)).length;
      }
      if (!dirty.size) return 0;
      const parents = [...dirty];
      dirty.clear();
      try {
        return (await runAggregate(parents)).length;
      } catch (e) {
        parents.forEach((p) => dirty.add(p));
        throw e;
      }
    },
    pending: () => queue.length,
  };
}

export type Coverage = ReturnType<typeof createCoverage>;

const MEASUREMENT_COLUMNS = "ts, lng, accuracy_m, h3_8, h3_9, h3_10, operator, tech, link_type, link_conf, up_kbps, down_kbps, rtt_ms, loss_pct, moving, device_hash";

/** Implémentation Supabase (clé secrète du Core). */
export function supabaseCoverageDb(db: SupabaseClient): CoverageDb {
  return {
    async prefs(userId) {
      const [p, z] = await Promise.all([
        db.from("profiles").select("coverage_consent, mobile_operator").eq("id", userId).maybeSingle(),
        db.from("private_zones").select("lat, lng, radius_m").eq("user_id", userId),
      ]);
      if (p.error) throw new Error(p.error.message);
      if (z.error) throw new Error(z.error.message);
      return { consent: p.data?.coverage_consent === true, zones: (z.data ?? []) as Zone[], declared: (p.data?.mobile_operator as Declared | null) ?? null };
    },
    async insertMeasurements(rows) {
      const { data, error } = await db.from("measurements").insert(rows).select("id");
      if (error) throw new Error(`measurements : ${error.message}`);
      return (data ?? []).map((r) => r.id as number);
    },
    async insertPending(rows) {
      const { error } = await db.from("measurement_pending").insert(rows);
      if (error) throw new Error(`measurement_pending : ${error.message}`);
    },
    async insertContributions(rows) {
      const { error } = await db.from("contributions").insert(rows);
      if (error) throw new Error(`contributions : ${error.message}`);
    },
    async purge() {
      const { error } = await db.rpc("coverage_purge");
      if (error) throw new Error(`coverage_purge : ${error.message}`);
    },
    async measurements(parents) {
      const since = new Date(Date.now() - 90 * DAY).toISOString();
      const out: Measurement[] = [];
      const chunks = parents ? Array.from({ length: Math.ceil(parents.length / 100) }, (_, i) => parents.slice(i * 100, i * 100 + 100)) : [null];
      for (const chunk of chunks) {
        for (let from = 0; ; from += 1000) {
          let q = db.from("measurements").select(MEASUREMENT_COLUMNS).gte("ts", since).lte("accuracy_m", MAX_ACCURACY_M).not("h3_8", "is", null);
          if (chunk) q = q.in("h3_8", chunk);
          const { data, error } = await q.order("id").range(from, from + 999);
          if (error) throw new Error(`measurements : ${error.message}`);
          out.push(...((data ?? []) as Measurement[]));
          if (!data || data.length < 1000) break;
        }
      }
      return out;
    },
    async writeHexes(rows, parents) {
      const stamp = new Date().toISOString();
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db
          .from("coverage_hex")
          .upsert(rows.slice(i, i + 500).map((r) => ({ ...r, updated_at: stamp })), { onConflict: "res,h3_index,layer,operator,tech,mode" });
        if (error) throw new Error(`coverage_hex : ${error.message}`);
      }
      // Ce qui n'a pas été réécrit (mesures expirées ou effacées) disparaît.
      const chunks = parents ? Array.from({ length: Math.ceil(parents.length / 100) }, (_, i) => parents.slice(i * 100, i * 100 + 100)) : [null];
      for (const chunk of chunks) {
        let q = db.from("coverage_hex").delete().lt("updated_at", stamp);
        if (chunk) q = q.in("parent8", chunk);
        const { error } = await q;
        if (error) throw new Error(`coverage_hex : ${error.message}`);
      }
    },
    async erase(hashes, userId) {
      const m = await db.from("measurements").delete({ count: "exact" }).in("device_hash", hashes);
      if (m.error) throw new Error(`measurements : ${m.error.message}`);
      const c = await db.from("contributions").delete().eq("user_id", userId);
      if (c.error) throw new Error(`contributions : ${c.error.message}`);
      return m.count ?? 0;
    },
  };
}
