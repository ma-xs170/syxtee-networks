// Données du dashboard : types partagés (API /api/dashboard/overview ↔ pages) et formats français.

export type Range = "7d" | "30d";
export const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30 };
export const isRange = (v: unknown): v is Range => v === "7d" || v === "30d";

export type LiveSession = {
  id: string;
  relay_id: string | null;
  device_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_s: number;
  avg_kbps: number;
  peak_kbps: number;
  reconnects: number;
  relay: string;
  bitrate_series: number[];
  /** Relais du direct (null s'il a été supprimé depuis). */
  relay_info?: { name: string } | null;
};

export type Kpis = {
  seconds: number;
  count: number;
  avgSeconds: number;
  avgKbps: number;
  peakKbps: number;
};

export type Alert = { id: string; text: string; href: string; cta: string };

export type Overview = {
  range: Range;
  generatedAt: string;
  kpis: Kpis;
  previous: Kpis;
  /** Minutes de direct par jour (heure de Paris), 30 derniers jours, du plus ancien à aujourd'hui. */
  daily: { day: string; minutes: number; count?: number; avgKbps?: number; peakKbps?: number; peakAt?: string | null }[];
  last: LiveSession | null;
  recent: LiveSession[];
  hasEverStreamed: boolean;
  lastEndedAt: string | null;
  alerts: Alert[];
  /** URLs du relais principal (le plus ancien relais SRTLA actif), pour le guide de démarrage. */
  keys: { relay: string; moblin: string; srt: string; obs: string } | null;
  relays: { active: number; max: number };
  /** Relais actifs (sources de l'aperçu en direct). */
  sources: { id: string; name: string }[];
  coreStatus: "ok" | "down" | "off";
  /** Fuseau du compte : les jours et les heures des graphiques en dépendent. */
  timezone: string;
  plan: { name: string; streams: number };
};

export const SESSION_COLUMNS = "id, relay_id, device_name, started_at, ended_at, duration_s, avg_kbps, peak_kbps, reconnects, relay, bitrate_series, relay_info:relays(name)";

/** Nom affiché pour l'appareil d'un direct. */
export const deviceLabel = (s: Pick<LiveSession, "device_name" | "relay" | "relay_info">) => s.relay_info?.name ?? s.device_name ?? `Relais ${s.relay}`;

// ─────────────── Formats ───────────────

const nf = new Intl.NumberFormat("fr-FR");
/** Espace fine insécable des milliers remplacée par une espace insécable simple (rendu mono régulier). */
export const fmtInt = (n: number) => nf.format(Math.round(n)).replace(/ /g, " ");

/** « 1 h 21 », « 12 min », « 45 s ». */
export function fmtDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, "0")}`;
}

/** « 00:12:34 » (chronomètre). */
export function fmtClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** « 4 612 kbit/s ». */
export const fmtKbps = (kbps: number) => `${fmtInt(kbps)} kbit/s`;

/** « il y a 10 h », « il y a 3 j », « à l'instant ». */
export function fmtAgo(iso: string | number, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `il y a ${Math.floor(diff / 86400)} j`;
  return `il y a ${Math.floor(diff / (86400 * 30))} mois`;
}

const TZ = "Europe/Paris";
const fmtCache = new Map<string, Intl.DateTimeFormat>();
const fmt = (key: string, opts: Intl.DateTimeFormatOptions, timeZone: string) => {
  const k = `${key}|${timeZone}`;
  let f = fmtCache.get(k);
  if (!f) fmtCache.set(k, (f = new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone })));
  return f;
};

/** « sam. 27 sept., 21:04 » dans le fuseau du compte. */
export const fmtDate = (iso: string, timezone = TZ) => fmt("date", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, timezone).format(new Date(iso));
/** « sam. 3 oct. » à partir d'un instant, dans le fuseau du compte. */
export const fmtDateLong = (t: string | number, timezone = TZ) => fmt("daylong", { weekday: "short", day: "numeric", month: "short" }, timezone).format(new Date(t));
/** « 17:42 » ou « 17:42:10 » dans le fuseau du compte. */
export const fmtHour = (t: string | number, seconds = false, timezone = TZ) =>
  fmt(seconds ? "hms" : "hm", { hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}) }, timezone).format(new Date(t));
// Les jours AAAA-MM-JJ sont déjà des jours du fuseau du compte : on les affiche tels quels (UTC), sans nouveau décalage.
/** « sam. 3 oct. » à partir d'un jour AAAA-MM-JJ. */
export const fmtDayLong = (day: string) => fmt("daylong", { weekday: "short", day: "numeric", month: "short" }, "UTC").format(new Date(`${day}T12:00:00Z`));
/** « 27 sept. » à partir d'un jour AAAA-MM-JJ. */
export const fmtDay = (day: string) => fmt("day", { day: "numeric", month: "short" }, "UTC").format(new Date(`${day}T12:00:00Z`));

/** Évolution par rapport à la période précédente : « +12 % », ou null s'il n'y avait rien avant. */
export function delta(current: number, previous: number): { text: string; up: boolean } | null {
  if (!previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { text: `${pct >= 0 ? "+" : "−"}${Math.abs(pct)} %`, up: pct >= 0 };
}

/** Masque la clé d'une URL de stream : srtla://hôte:5000?streamid=live_•••••••• */
export function maskUrl(url: string) {
  // Clé seule (champ « Clé » RTMP) ou clé en fin de chemin RTMP (…/live/live_xxx).
  if (/^live_[0-9a-f]+$/i.test(url)) return "live_••••••••";
  if (url.startsWith("rtmp")) return url.replace(/\/(live_)[0-9a-f]+$/i, "/$1••••••••");
  return url.replace(/(streamid=)([a-z]+_)?[^&]*/i, (_m, p: string, prefix = "") => `${p}${prefix}••••••••`);
}
