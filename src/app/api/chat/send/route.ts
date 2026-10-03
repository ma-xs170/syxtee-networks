import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { allow } from "@/lib/auth/rateLimit";
import { ChatError, isPlatform, sendMessage } from "@/lib/chat/providers";

// POST /api/chat/send { platform, channel, text } : écrit dans le chat avec le compte relié de l'utilisateur connecté.
// `channel` : pseudo Twitch, pseudo Kick ou identifiant de vidéo YouTube. 20 messages par 10 secondes au plus.
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { platform?: string; channel?: string; text?: string } | null;
  const { platform, channel, text } = body ?? {};
  if (!platform || !isPlatform(platform) || typeof channel !== "string" || typeof text !== "string") return Response.json({ error: "bad_request" }, { status: 400 });
  if (!/^[\w-]{3,40}$/.test(channel)) return Response.json({ error: "bad_channel" }, { status: 400 });
  if (!(await allow(`chatsend:${user.id}`, 20, 10))) return Response.json({ error: "rate_limited" }, { status: 429 });
  try {
    await sendMessage(user.id, platform, platform === "youtube" ? channel : channel.toLowerCase(), text);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof ChatError) return Response.json({ error: e.code }, { status: e.status });
    console.error("chat send", platform, e instanceof Error ? e.message : e);
    return Response.json({ error: "send_failed" }, { status: 502 });
  }
}
