import { getUser } from "@/lib/auth/dal";
import { youtubeToken } from "@/lib/chat/providers";
import { budget, limitOr429 } from "@/lib/guard";

// GET /api/youtube/live : identifiant du direct YouTube EN COURS du compte relié (aucune adresse à coller). videoId null s'il n'y en a pas.
// Un appel liveBroadcasts.list coûte 1 unité de quota.
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const limited = await limitOr429(`yt-live:${user.id}`, 12, 60);
  if (limited) return limited;
  const token = await youtubeToken(user.id);
  if (!token) return Response.json({ videoId: null });
  // Plafond du jour : le quota Google est partagé par tout le projet (10 000 unités, 1 par appel ici).
  if (!(await budget("youtube-live", 3000))) return Response.json({ videoId: null, error: "quota" }, { status: 503, headers: { "Retry-After": "600" } });
  try {
    const res = await fetch("https://www.googleapis.com/youtube/v3/liveBroadcasts?part=id,status&broadcastStatus=active&maxResults=1", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return Response.json({ videoId: null });
    const j = (await res.json()) as { items?: { id: string }[] };
    return Response.json({ videoId: j.items?.[0]?.id ?? null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ videoId: null });
  }
}
