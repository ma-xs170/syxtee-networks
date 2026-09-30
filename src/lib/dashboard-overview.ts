import "server-only";
import type { Profile } from "@/lib/auth/dal";
import { hasCore, listRelays, type RelayView } from "@/lib/core";
import { relayLimit, type Plan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { RANGE_DAYS, SESSION_COLUMNS, type Alert, type Kpis, type LiveSession, type Overview, type Range } from "./dashboard-data";

// Vue d'ensemble du dashboard : calculée à partir de live_sessions (lecture avec la session de l'utilisateur, RLS)
// et des relais du Core. Gardée 30 s en mémoire par utilisateur et par période.

const DAY = 86_400_000;
const TTL = 30_000;
const memo = new Map<string, { at: number; data: Overview }>();

/** Jour AAAA-MM-JJ à l'heure de Paris. */
const parisDay = (t: number | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(t);

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

export function dailyMinutes(sessions: LiveSession[], now: number, days = 30) {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const d = parisDay(new Date(s.started_at));
    byDay.set(d, (byDay.get(d) ?? 0) + s.duration_s / 60);
  }
  return Array.from({ length: days }, (_, i) => {
    const day = parisDay(now - (days - 1 - i) * DAY);
    return { day, minutes: Math.round(byDay.get(day) ?? 0) };
  });
}

export function buildAlerts(o: { month: LiveSession[]; profile: Profile; relays: RelayView[]; coreOk: boolean; hasEverStreamed: boolean }): Alert[] {
  const alerts: Alert[] = [];
  const short = o.month.filter((s) => s.ended_at && s.duration_s < 60).length;
  if (short >= 3)
    alerts.push({
      id: "short",
      text: `${short} directs ont duré moins d'une minute sur 30 jours : ta diffusion coupe peut-être.`,
      href: "/dashboard/lives",
      cta: "Voir mes lives",
    });
  const reconnects = o.month.reduce((a, s) => a + s.reconnects, 0);
  if (reconnects >= 10)
    alerts.push({
      id: "reconnects",
      text: `${reconnects} coupures sur 30 jours. Vérifie tes connexions dans Moblin.`,
      href: "/dashboard/sante",
      cta: "Santé du flux",
    });
  if (!o.profile.twitch_login)
    alerts.push({ id: "twitch", text: "Ton Twitch n'est pas renseigné : tu n'apparais pas sur le site.", href: "/dashboard/profil", cta: "Profil" });
  const active = o.relays.filter((r) => !r.archived);
  if (o.coreOk && !active.length) alerts.push({ id: "norelay", text: "Tu n'as pas encore de relais.", href: "/dashboard/relais", cta: "Créer un relais" });
  else if (active.length && !o.hasEverStreamed) alerts.push({ id: "unused", text: "Ton relais n'a jamais été utilisé.", href: "/dashboard/relais", cta: "Mes relais" });
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
  const supabase = await createClient();
  let q = supabase.from("live_sessions").select(SESSION_COLUMNS).order("started_at", { ascending: false }).limit(opts.limit ?? 2000);
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
  const supabase = await createClient();
  const { data } = await supabase.from("live_sessions").select(SESSION_COLUMNS).eq("id", id).maybeSingle();
  return (data as unknown as LiveSession | null) ?? null;
}

export async function getOverview(userId: string, profile: Profile, range: Range, plan: Plan): Promise<Overview> {
  const key = `${userId}:${range}`;
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
    daily: dailyMinutes(month, now),
    last: done[0] ?? null,
    recent: latest,
    hasEverStreamed,
    lastEndedAt: done[0]?.ended_at ?? null,
    alerts: buildAlerts({ month, profile, relays, coreOk: status === "ok", hasEverStreamed }),
    keys: mainKeys(relays),
    relays: { active: relays.filter((r) => !r.archived).length, max: relayLimit(plan) },
    coreStatus: status,
    plan: { name: plan.name, streams: Number.isFinite(plan.maxConcurrentStreams) ? plan.maxConcurrentStreams : 99 },
  };
  memo.set(key, { at: now, data });
  if (memo.size > 500) for (const [k, v] of memo) if (now - v.at > TTL) memo.delete(k);
  return data;
}

/** Après une action (clé régénérée…) : les chiffres doivent se recalculer tout de suite. */
export function forgetOverview(userId: string) {
  memo.delete(`${userId}:7d`);
  memo.delete(`${userId}:30d`);
}

/** Page Statistiques : période choisie et période précédente, avec quelques chiffres de plus. */
export async function getStats(range: Range) {
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
    daily: dailyMinutes(cur, now, days),
  };
}
