// Moteur de calcul de la carte de couverture (fonctions pures, testées avec des jeux simulés).
// Pour chaque hexagone H3 (rés. 8, 9 et 10), chaque opérateur / techno et chaque mode (tous, à pied, en véhicule) :
// - seules les mesures 'cellular' (confiance ≥ 0,7) vont dans la couche 4G/5G ; Starlink a sa propre couche ; le Wi-Fi nulle part ;
// - valeurs aberrantes exclues par hexagone et par opérateur, à l'arrêt / en mouvement séparément (médiane ± 3 MAD) ;
// - valeurs pondérées : fraîcheur × précision GPS × confiance du type de lien (× 0,25 en mouvement sur la carte « à pied ») ;
// - publié dès 1 contributeur et 5 mesures valides, avec un indice de fiabilité.

import { MIN_CONF } from "./link.ts";

export type Mode = "all" | "foot" | "vehicle";
export type Layer = "cellular" | "starlink";
export type Reliability = "estimation" | "fiable" | "tres_fiable";

export type Measurement = {
  ts: string;
  lng: number;
  accuracy_m: number | null;
  h3_8: string;
  h3_9: string | null; // null : point des 60 premières secondes, publié seulement à la rés. 8
  h3_10: string | null;
  operator: string | null;
  tech: string;
  link_type: string;
  link_conf: number;
  up_kbps: number | null;
  down_kbps: number | null;
  rtt_ms: number | null;
  loss_pct: number | null;
  moving: boolean;
  device_hash: string;
};

export type HexAggregate = {
  res: 8 | 9 | 10;
  h3_index: string;
  parent8: string;
  layer: Layer;
  operator: string;
  tech: string;
  mode: Mode;
  median_kbps: number | null;
  p10_kbps: number | null;
  down_kbps: number | null;
  rtt_ms: number | null;
  loss_pct: number | null;
  n: number;
  contributors: number;
  days: number;
  hours: number[]; // [matin, après-midi, soir, nuit]
  reliability: Reliability;
  score: "bonne" | "moyenne" | "mauvaise" | "inconnue";
  freshness: number;
  last_ts: string;
  first_month: string;
  last_month: string;
  published: boolean;
};

export const MIN_N = 5;
export const MAX_ACCURACY_M = 20;
export const MOVING_KMH = 30;
const DAY = 86_400_000;
const FRESH_DAYS = 90;
const FOOT_MOVING_WEIGHT = 0.25;

// ─────────────── Statistiques pondérées ───────────────

export function median(xs: number[]) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Quantile pondéré (q entre 0 et 1). */
export function wQuantile(pairs: [value: number, weight: number][], q: number): number | null {
  const p = pairs.filter(([v, w]) => Number.isFinite(v) && w > 0).sort((a, b) => a[0] - b[0]);
  if (!p.length) return null;
  const total = p.reduce((a, [, w]) => a + w, 0);
  let cum = 0;
  for (const [v, w] of p) {
    cum += w;
    if (cum >= q * total - 1e-9) return v;
  }
  return p[p.length - 1][0];
}

function wMean(pairs: [number, number][]) {
  const p = pairs.filter(([v, w]) => Number.isFinite(v) && w > 0);
  const tw = p.reduce((a, [, w]) => a + w, 0);
  return tw ? p.reduce((a, [v, w]) => a + v * w, 0) / tw : null;
}

/** Garde les valeurs dans médiane ± 3 MAD (MAD normalisée ; plancher 5 % de la médiane pour les séries très régulières). */
export function madFilter<T>(items: T[], value: (t: T) => number) {
  if (items.length < 3) return items;
  const xs = items.map(value);
  const med = median(xs);
  const mad = 1.4826 * median(xs.map((x) => Math.abs(x - med)));
  const tol = 3 * Math.max(mad, 0.05 * Math.abs(med), 1);
  return items.filter((_, i) => Math.abs(xs[i] - med) <= tol);
}

// ─────────────── Pondération ───────────────

export const freshnessOf = (ts: string, now: number) => Math.exp(-Math.max(0, now - Date.parse(ts)) / (FRESH_DAYS * DAY));
/** Précision GPS : 1 jusqu'à 5 m, puis décroît jusqu'à 0,5 (≥ 25 m). */
export const gpsWeight = (acc: number | null) => (acc === null ? 0.5 : Math.min(1, Math.max(0.5, 1 - Math.max(0, acc - 5) / 40)));

export const weight = (m: Measurement, now: number, mode: Mode) =>
  freshnessOf(m.ts, now) * gpsWeight(m.accuracy_m) * m.link_conf * (mode === "foot" && m.moving ? FOOT_MOVING_WEIGHT : 1);

/** Tranche horaire à l'heure solaire locale (longitude) : 0 matin 6-12 h, 1 après-midi 12-18 h, 2 soir 18-23 h, 3 nuit. */
export function hourBucket(ts: string, lng: number) {
  const d = new Date(ts);
  const h = (((d.getUTCHours() + d.getUTCMinutes() / 60 + lng / 15) % 24) + 24) % 24;
  return h >= 6 && h < 12 ? 0 : h >= 12 && h < 18 ? 1 : h >= 18 && h < 23 ? 2 : 3;
}

export function reliability(contributors: number, n: number, days: number, buckets: number): Reliability {
  if (contributors >= 5 || (n >= 100 && days >= 2 && buckets >= 2)) return "tres_fiable";
  if (contributors >= 2 || n >= 20) return "fiable";
  return "estimation";
}

export function scoreOf(med: number | null, loss: number | null): HexAggregate["score"] {
  if (med === null) return "inconnue";
  if (med < 2000 || (loss ?? 0) > 5) return "mauvaise";
  if (med >= 5000 && (loss ?? 0) < 2) return "bonne";
  return "moyenne";
}

/** Couche publique d'une mesure, ou null (Wi-Fi, box, inconnu, confiance trop faible). */
export function layerOf(m: Pick<Measurement, "link_type" | "link_conf">): Layer | null {
  if (m.link_conf < MIN_CONF) return null;
  if (m.link_type === "cellular") return "cellular";
  if (m.link_type === "starlink") return "starlink";
  return null;
}

const month = (ms: number) => new Date(ms).toISOString().slice(0, 7);

function summarize(ms: Measurement[], now: number, mode: Mode) {
  const w = ms.map((m) => weight(m, now, mode));
  const pick = (f: (m: Measurement) => number | null) => ms.flatMap((m, i): [number, number][] => (f(m) === null ? [] : [[f(m)!, w[i]]]));
  const up = pick((m) => m.up_kbps);
  const med = wQuantile(up, 0.5);
  const loss = wMean(pick((m) => m.loss_pct));
  const times = ms.map((m) => Date.parse(m.ts));
  const last = Math.max(...times);
  const contributors = new Set(ms.map((m) => m.device_hash)).size;
  const days = new Set(ms.map((m) => m.ts.slice(0, 10))).size;
  const hours = [0, 0, 0, 0];
  for (const m of ms) hours[hourBucket(m.ts, m.lng)]++;
  const r = (v: number | null) => (v === null ? null : Math.round(v));
  const lastDate = new Date(last);
  // Un seul contributeur : jamais l'heure ni le jour exacts, seulement le mois.
  const lastTs =
    contributors === 1
      ? new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), 1)).toISOString()
      : new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), lastDate.getUTCDate())).toISOString();
  return {
    median_kbps: r(med),
    p10_kbps: r(wQuantile(up, 0.1)),
    down_kbps: r(wQuantile(pick((m) => m.down_kbps), 0.5)),
    rtt_ms: r(wQuantile(pick((m) => m.rtt_ms), 0.5)),
    loss_pct: loss === null ? null : Math.round(loss * 100) / 100,
    n: ms.length,
    contributors,
    days,
    hours,
    reliability: reliability(contributors, ms.length, days, hours.filter(Boolean).length),
    score: scoreOf(med, loss),
    freshness: Math.round(Math.exp(-(now - times.reduce((a, t) => a + t, 0) / times.length) / (FRESH_DAYS * DAY)) * 1000) / 1000,
    last_ts: lastTs,
    first_month: month(Math.min(...times)),
    last_month: month(last),
    published: ms.length >= MIN_N && contributors >= 1,
  };
}

const CELL = { 8: "h3_8", 9: "h3_9", 10: "h3_10" } as const;

/** Tous les agrégats pour ces mesures (déjà limitées aux 90 derniers jours). */
export function aggregate(measurements: Measurement[], now = Date.now()): HexAggregate[] {
  const out: HexAggregate[] = [];
  const valid = measurements.filter((m) => m.up_kbps !== null && m.accuracy_m !== null && m.accuracy_m <= MAX_ACCURACY_M && layerOf(m) !== null);
  for (const res of [8, 9, 10] as const) {
    // Hexagone × couche.
    const cells = new Map<string, Measurement[]>();
    for (const m of valid) {
      const cell = m[CELL[res]];
      if (!cell) continue;
      const k = `${cell}|${layerOf(m)}`;
      const list = cells.get(k);
      if (list) list.push(m);
      else cells.set(k, [m]);
    }
    for (const [k, list] of cells) {
      const [cell, layer] = k.split("|") as [string, Layer];
      // Aberrations : par hexagone et par opérateur (à l'arrêt et en mouvement séparés : deux réalités différentes).
      const byOp = new Map<string, Measurement[]>();
      for (const m of list) {
        const op = `${m.operator ?? "inconnu"}|${m.moving}`;
        byOp.set(op, [...(byOp.get(op) ?? []), m]);
      }
      const kept = [...byOp.values()].flatMap((ms) => madFilter(ms, (m) => m.up_kbps!));
      const groups = new Map<string, Measurement[]>([["*|*", kept]]);
      for (const m of kept) {
        const g = `${m.operator ?? "inconnu"}|${m.tech}`;
        groups.set(g, [...(groups.get(g) ?? []), m]);
      }
      for (const [g, ms] of groups) {
        const [operator, tech] = g.split("|");
        for (const mode of ["all", "foot", "vehicle"] as const) {
          const sub = mode === "vehicle" ? ms.filter((m) => m.moving) : ms;
          if (!sub.length) continue;
          out.push({ res, h3_index: cell, parent8: sub[0].h3_8, layer, operator, tech, mode, ...summarize(sub, now, mode) });
        }
      }
    }
  }
  return out;
}
