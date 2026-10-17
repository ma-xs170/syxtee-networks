import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { budget, limitOr429 } from "@/lib/guard";

// GET /api/kick/chatroom?slug=pseudo : identifiant du chat Kick d'une chaîne (Multichat).
// Le navigateur ne peut pas interroger Kick lui-même (CORS). Réservé aux comptes connectés, résultat gardé 1 h.
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  if (!/^[A-Za-z0-9_-]{3,25}$/.test(slug)) return Response.json({ error: "bad_slug" }, { status: 400 });
  const limited = await limitOr429(`kick:${user.id}`, 20, 60);
  if (limited) return limited;
  if (!(await budget("kick", 2000))) return Response.json({ error: "kick_unavailable" }, { status: 503, headers: { "Retry-After": "600" } });
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug.toLowerCase())}`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; SYXTEE-Multichat)" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 },
    });
    if (res.status === 404) return Response.json({ error: "not_found" }, { status: 404 });
    if (!res.ok) return Response.json({ error: "kick_unavailable" }, { status: 502 });
    const data = (await res.json()) as { chatroom?: { id?: number } };
    const id = data.chatroom?.id;
    if (typeof id !== "number") return Response.json({ error: "kick_unavailable" }, { status: 502 });
    return Response.json({ id }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch {
    return Response.json({ error: "kick_unavailable" }, { status: 502 });
  }
}
