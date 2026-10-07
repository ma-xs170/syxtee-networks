import { accountTimezone } from "@/lib/regions";
import "server-only";
import type { Profile } from "@/lib/auth/dal";
import { hasCore, listRelays, type RelayView } from "@/lib/core";
import { relayLimit, type Plan } from "@/lib/plans";
import { dataClient } from "@/lib/workspace";
import { RANGE_DAYS, SESSION_COLUMNS, type Alert, type Kpis, type LiveSession, type Overview, type Range } from "./dashboard-data";

// Vue d'ensemble du dashboard : calculée à partir de live_sessions (lecture avec la session de l'utilisateur, RLS)
// et des relais du Core. Gardée 30 s en mémoire par utilisateur et par période.

const DAY = 86_400_000;
const TTL = 30_000;
const memo = new Map<string, { at: number; data: Overview }>();

/** Jour AAAA-MM-JJ dans le fuseau du compte. */
const localDay = (t: number | Date, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(t);

export function computeKpis(sessions: LiveSession[]): Kpis {
  const seconds = sessions.reduce((a, s) => a + s.duration_s, 0);
  const weighted = sessions.reduce((a, s) => a + s.avg_kbps * s.duration_s, 0);
  return {
    seconds,
    count: sessions.length,
    avgSeconds: sessions.length ? seconds / sessions.length : 0,
    avgKbps: seconds ? weighted / seconds : 0,
    peakKbps: Math.max(0, ...sessions.map((s) => s.peak_kbps)),
  };
}

export function dailyMinutes(sessions: LiveSession[], now: number, days = 30, timezone = "Europe/Paris") {
  type Day = { seconds: number; count: number; kbpsSeconds: number; peakKbps: number; peakAt: string | null };
  const byDay = new Map<string, Day>();
  for (const s of sessions) {
    const d = localDay(new Date(s.started_at), timezone);
    const cur = byDay.get(d) ?? { seconds: 0, count: 0, kbpsSeconds: 0, peakKbps: 0, peakAt: null };
    cur.seconds += s.duration_s;
    cur.count += 1;
    cur.kbpsSeconds += s.avg_kbps * s.duration_s;
    if (s.peak_kbps > cur.peakKbps) {
      cur.peakKbps = s.peak_kbps;
      // Heure du pic : les relevés sont répartis régulièrement sur la durée du direct.
      const series = s.bitrate_series ?? [];
      const top = series.length > 1 ? series.indexOf(Math.max(...series)) : 0;
      const offset = series.length > 1 ? (top / (series.length - 1)) * s.duration_s * 1000 : 0;
      cur.peakAt = new Date(new Date(s.started_at).getTime() + offset).toISOString();
    }
    byDay.set(d, cur);
  }
  return Array.from({ length: days }, (_, i) => {
    const day = localDay(now - (days - 1 - i) * DAY, timezone);
    const v = byDay.get(day);
    return {
      day,
      minutes: Math.round((v?.seconds ?? 0) / 60),
      count: v?.count ?? 0,
      avgKbps: v && v.seconds ? Math.round(v.kbpsSeconds / v.seconds) : 0,
      peakKbps: v?.peakKbps ?? 0,
      peakAt: v?.peakAt ?? null,
    };
  });
}

/** Seulement ce qui compromet un direct : relais injoignable, pas de relais, coupures répétées, directs qui avortent. */
export function buildAlerts(o: { month: LiveSession[]; profile: Profile; relays: RelayView[]; coreOk: boolean; hasEverStreamed: boolean }): Alert[] {
  const alerts: Alert[] = [];
  const active = o.relays.filter((r) => !r.archived);
  if (!o.coreOk) alerts.push({ id: "core", text: "Le relais ne répond pas pour le moment. Tes directs peuvent être impossibles.", href: "/dashboard/relais", cta: "Mes relais" });
  else if (!active.length) alerts.push({ id: "norelay", text: "Tu n'as pas encore de relais : sans lui, impossible de lancer un direct.", href: "/dashboard/relais", cta: "Créer un relais" });
  const reconnects = o.month.reduce((a, s) => a + s.reconnects, 0);
  if (reconnects >= 10)
    alerts.push({
      id: "reconnects",
      text: `${reconnects} coupures sur 30 jours. Vérifie tes connexions dans Moblin.`,
      href: "/dashboard/apercu",
      cta: "Ouvrir l'aperçu",
    });
  const short = o.month.filter((s) => s.ended_at && s.duration_s < 60).length;
  if (short >= 3)
    alerts.push({
      id: "short",
      text: `${short} directs ont duré moins d'une minute sur 30 jours : ta diffusion coupe peut-être.`,
      href: "/dashboard/lives",
      cta: "Voir mes lives",
    });
  return alerts.slice(0, 3);
}

async function loadRelayViews(userId: string): Promise<{ relays: RelayView[]; status: Overview["coreStatus"] }> {
  if (!hasCore) return { relays: [], status: "off" };
  try {
    return { relays: await listRelays(userId), status: "ok" };
  } catch (e) {
    console.error("dashboard : Core", e);
    return { relays: [], status: "down" };
  }
}

/** URLs du relais principal : le plus ancien relais SRTLA actif. */
function mainKeys(relays: RelayView[]): Overview["keys"] {
  const r = relays.find((x) => !x.archived && x.protocol === "srtla");
  return r && r.urls.srtla_url && r.urls.srt_url ? { relay: r.name, moblin: r.urls.srtla_url, srt: r.urls.srt_url, obs: r.obs_srt_url } : null;
}

/** Directs de l'utilisateur connecté (RLS), du plus récent au plus ancien. */
export async function listSessions(opts: { since?: number; limit?: number; relayId?: string } = {}) {
  const { db: supabase, ownerId } = await dataClient();
  let q = supabase.from("live_sessions").select(SESSION_COLUMNS).order("started_at", { ascending: false }).limit(opts.limit ?? 2000);
  if (ownerId) q = q.eq("user_id", ownerId);
  if (opts.since) q = q.gte("started_at", new Date(opts.since).toISOString());
  if (opts.relayId) q = q.eq("relay_id", opts.relayId);
  const { data, error } = await q;
  if (error) {
    // Table absente (migration pas encore appliquée) : dashboard vide plutôt qu'en erreur.
    console.error("live_sessions", error.message);
    return [];
  }
  return (data ?? []) as unknown as LiveSession[]; // relay_info : objet (relation plusieurs-à-un), pas un tableau
}

export async function getSession(id: string) {
  const { db: supabase, ownerId } = await dataClient();
  let q = supabase.from("live_sessions").select(SESSION_COLUMNS).eq("id", id);
  if (ownerId) q = q.eq("user_id", ownerId);
  const { data } = await q.maybeSingle();
  return (data as unknown as LiveSession | null) ?? null;
}

export async function getOverview(userId: string, profile: Profile, range: Range, plan: Plan): Promise<Overview> {
  const timezone = accountTimezone(profile);
  const key = `${userId}:${range}:${timezone}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const now = Date.now();
  const days = RANGE_DAYS[range];
  const [recent60, latest, { relays, status }] = await Promise.all([
    listSessions({ since: now - Math.max(60, days * 2) * DAY }),
    listSessions({ limit: 3 }),
    loadRelayViews(userId),
  ]);

  const finished = recent60.filter((s) => s.ended_at);
  const inRange = (s: LiveSession, from: number, to: number) => {
    const t = new Date(s.started_at).getTime();
    return t >= from && t < to;
  };
  const current = finished.filter((s) => inRange(s, now - days * DAY, now + 1));
  const previous = finished.filter((s) => inRange(s, now - 2 * days * DAY, now - days * DAY));
  const month = finished.filter((s) => inRange(s, now - 30 * DAY, now + 1));
  const done = latest.filter((s) => s.ended_at);
  const hasEverStreamed = latest.length > 0;

  const data: Overview = {
    range,
    generatedAt: new Date(now).toISOString(),
    kpis: computeKpis(current),
    previous: computeKpis(previous),
    daily: dailyMinutes(month, now, 30, timezone),
    last: done[0] ?? null,
    recent: latest,
    hasEverStreamed,
    lastEndedAt: done[0]?.ended_at ?? null,
    alerts: buildAlerts({ month, profile, relays, coreOk: status === "ok", hasEverStreamed }),
    keys: mainKeys(relays),
    relays: { active: relays.filter((r) => !r.archived).length, max: relayLimit(plan) },
    sources: relays.filter((r) => !r.archived).map((r) => ({ id: r.id, name: r.name })),
    coreStatus: status,
    timezone,
    plan: { name: plan.name, streams: Number.isFinite(plan.maxConcurrentStreams) ? plan.maxConcurrentStreams : 99 },
  };
  memo.set(key, { at: now, data });
  if (memo.size > 500) for (const [k, v] of memo) if (now - v.at > TTL) memo.delete(k);
  return data;
}

/** Après une action (clé régénérée…) : les chiffres doivent se recalculer tout de suite. */
export function forgetOverview(userId: string) {
  for (const k of memo.keys()) if (k.startsWith(`${userId}:`)) memo.delete(k);
}

/** Page Statistiques : période choisie et période précédente, avec quelques chiffres de plus. */
export async function getStats(range: Range, timezone = "Europe/Paris") {
  const now = Date.now();
  const days = RANGE_DAYS[range];
  const all = (await listSessions({ since: now - Math.max(60, days * 2) * DAY })).filter((s) => s.ended_at);
  const within = (s: LiveSession, from: number, to: number) => {
    const t = new Date(s.started_at).getTime();
    return t >= from && t < to;
  };
  const cur = all.filter((s) => within(s, now - days * DAY, now + 1));
  const prev = all.filter((s) => within(s, now - 2 * days * DAY, now - days * DAY));
  return {
    days,
    any: all.length > 0,
    kpis: computeKpis(cur),
    previous: computeKpis(prev),
    longest: cur.reduce<LiveSession | null>((m, s) => (!m || s.duration_s > m.duration_s ? s : m), null),
    reconnects: cur.reduce((a, s) => a + s.reconnects, 0),
    short: cur.filter((s) => s.duration_s < 60).length,
    daily: dailyMinutes(cur, now, days, timezone),
    timezone,
  };
}
