import type { NextRequest } from "next/server";
import { loadShared, toIcs } from "@/lib/calendar-data";
import { site } from "@/lib/site";

// GET /calendrier/<jeton>/live.ics : flux iCalendar du calendrier partagé. Apple Calendrier, Google Agenda et Outlook s'y abonnent
// (webcal://) et se mettent à jour tout seuls. Le jeton est le secret : inconnu ou retiré = 404.
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await loadShared(token).catch(() => null);
  if (!shared) return new Response("Calendrier introuvable", { status: 404, headers: { "Cache-Control": "no-store" } });
  const host = new URL(site.url).hostname;
  return new Response(toIcs(shared.events, `Lives de ${shared.name}`, host, `${site.url}/calendrier/${token}`), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="lives-syxtee.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
