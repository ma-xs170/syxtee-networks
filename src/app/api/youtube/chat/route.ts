import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { youtubeToken } from "@/lib/chat/providers";

// GET /api/youtube/chat?v=<identifiant de la vidéo>&after=<jeton de page> : messages du chat d'un direct YouTube (Multichat).
// YouTube n'a pas de connexion en direct côté navigateur : on interroge l'API Data à la cadence qu'elle demande
// (pollingIntervalMillis) et on garde la réponse 4 s en mémoire. Clé : YOUTUBE_API_KEY, sinon le compte YouTube relié.
// Attention au quota : chaque lecture coûte 5 unités sur les 10 000 par jour du projet Google.

const KEY = (process.env.YOUTUBE_API_KEY ?? "").trim();
const API = "https://www.googleapis.com/youtube/v3";

const chatIds = new Map<string, { id: string; at: number }>();
const polls = new Map<string, { at: number; body: unknown }>();

type Item = { id: string; snippet: { type: string; displayMessage?: string }; authorDetails: { displayName: string } };

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const v = request.nextUrl.searchParams.get("v") ?? "";
  const after = request.nextUrl.searchParams.get("after") ?? "";
  if (!/^[\w-]{11}$/.test(v) || after.length > 300) return Response.json({ error: "bad_request" }, { status: 400 });

  const token = KEY ? null : await youtubeToken(user.id);
  if (!KEY && !token) return Response.json({ error: "youtube_unavailable" }, { status: 503 });
  const call = (path: string) => fetch(`${API}${path}${KEY ? `&key=${KEY}` : ""}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store", signal: AbortSignal.timeout(8000) });

  try {
    let chat = chatIds.get(v);
    if (!chat || Date.now() - chat.at > 600_000) {
      const r = await call(`/videos?part=liveStreamingDetails&id=${v}`);
      if (!r.ok) return Response.json({ error: "youtube_unavailable" }, { status: 502 });
      const id = ((await r.json()) as { items?: { liveStreamingDetails?: { activeLiveChatId?: string } }[] }).items?.[0]?.liveStreamingDetails?.activeLiveChatId;
      if (!id) return Response.json({ error: "no_live_chat" }, { status: 404 });
      chat = { id, at: Date.now() };
      chatIds.set(v, chat);
    }

    const key = `${chat.id}|${after}`;
    const hit = polls.get(key);
    if (hit && Date.now() - hit.at < 4000) return Response.json(hit.body);

    const r = await call(`/liveChat/messages?liveChatId=${encodeURIComponent(chat.id)}&part=snippet,authorDetails&maxResults=200${after ? `&pageToken=${encodeURIComponent(after)}` : ""}`);
    if (r.status === 403 || r.status === 404) {
      chatIds.delete(v);
      return Response.json({ error: "no_live_chat" }, { status: 404 });
    }
    if (!r.ok) return Response.json({ error: "youtube_unavailable" }, { status: 502 });
    const j = (await r.json()) as { items?: Item[]; nextPageToken?: string; pollingIntervalMillis?: number };
    const body = {
      messages: (j.items ?? []).filter((i) => i.snippet.type === "textMessageEvent" && i.snippet.displayMessage).map((i) => ({ id: i.id, user: i.authorDetails.displayName, text: i.snippet.displayMessage })),
      next: j.nextPageToken ?? "",
      interval: j.pollingIntervalMillis ?? 6000,
    };
    polls.set(key, { at: Date.now(), body });
    if (polls.size > 200) for (const [k, p] of polls) if (Date.now() - p.at > 60_000) polls.delete(k);
    return Response.json(body);
  } catch {
    return Response.json({ error: "youtube_unavailable" }, { status: 502 });
  }
}
