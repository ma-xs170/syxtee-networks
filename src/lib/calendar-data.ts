import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIVE_COLUMNS, platformOf, SHARE_TOKEN, type LiveEvent } from "@/lib/calendar";

// Calendrier des lives : lectures serveur (clé de service, toujours filtrées sur le propriétaire ou sur le jeton de partage).

const DAY = 24 * 3600_000;
/** Fenêtre chargée : un an en arrière, deux ans en avant. Le navigateur navigue dedans sans rien redemander. */
const WINDOW = { before: 366 * DAY, after: 731 * DAY };
const MAX_ROWS = 1500;

export type EventRow = LiveEvent & { updated_at: string };

export async function listEvents(ownerId: string, now = Date.now()): Promise<EventRow[]> {
  const { data } = await createAdminClient()
    .from("scheduled_lives")
    .select(`${LIVE_COLUMNS}, updated_at`)
    .eq("owner_id", ownerId)
    .gte("ends_at", new Date(now - WINDOW.before).toISOString())
    .lte("starts_at", new Date(now + WINDOW.after).toISOString())
    .order("starts_at")
    .limit(MAX_ROWS);
  return (data as EventRow[] | null) ?? [];
}

/** Prochains lives (en cours ou à venir), les plus proches d'abord : widget du tableau de bord. */
export async function listUpcoming(ownerId: string, limit = 3, now = Date.now()): Promise<LiveEvent[]> {
  const { data } = await createAdminClient().from("scheduled_lives").select(LIVE_COLUMNS).eq("owner_id", ownerId).gt("ends_at", new Date(now).toISOString()).order("starts_at").limit(limit);
  return (data as LiveEvent[] | null) ?? [];
}

export async function getShareToken(ownerId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("calendar_shares").select("token").eq("owner_id", ownerId).maybeSingle();
  return (data as { token: string } | null)?.token ?? null;
}

export const newShareToken = () => randomBytes(16).toString("hex");

/** Calendrier derrière un lien de partage : propriétaire, nom affichable et lives. Null si le jeton est inconnu ou retiré. */
export async function loadShared(token: string): Promise<{ name: string; events: EventRow[] } | null> {
  if (!SHARE_TOKEN.test(token)) return null;
  const db = createAdminClient();
  const { data: share } = await db.from("calendar_shares").select("owner_id").eq("token", token).maybeSingle();
  const ownerId = (share as { owner_id: string } | null)?.owner_id;
  if (!ownerId) return null;
  const [events, { data: profile }, { data: ws }] = await Promise.all([
    listEvents(ownerId),
    db.from("profiles").select("first_name, twitch_display_name, username").eq("id", ownerId).maybeSingle(),
    db.from("workspaces").select("name").eq("id", ownerId).maybeSingle(),
  ]);
  const p = profile as { first_name: string | null; twitch_display_name: string | null; username: string | null } | null;
  const name = (ws as { name: string } | null)?.name || p?.twitch_display_name || p?.first_name || p?.username || "SYXTEE";
  return { name, events };
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Replie une ligne iCalendar à 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/** Flux iCalendar (.ics) : s'abonne dans Apple Calendrier, Google Agenda ou Outlook. */
export function toIcs(events: EventRow[], calendarName: string, host: string, pageUrl?: string): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SYXTEE NETWORKS//Calendrier des lives//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(calendarName)}`, "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  for (const e of events) {
    const names = e.platforms.map((p) => platformOf(p)?.label ?? p);
    const desc = [names.length ? `Plateformes : ${names.join(", ")}` : "", e.description].filter(Boolean).join("\n\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@${host}`,
      `DTSTAMP:${stamp(e.updated_at)}`,
      `DTSTART:${stamp(e.starts_at)}`,
      `DTEND:${stamp(e.ends_at)}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
      ...(desc ? [`DESCRIPTION:${esc(desc)}`] : []),
      ...(names.length ? [`CATEGORIES:${names.map(esc).join(",")}`] : []),
      ...(pageUrl ? [`URL:${pageUrl}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
