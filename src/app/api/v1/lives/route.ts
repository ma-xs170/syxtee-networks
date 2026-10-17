import { apiKeyUser } from "@/lib/developers";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/lives?limit=20 : derniers directs du compte (durée, débit, coupures). Lecture seule, sans clé de stream.
export async function GET(request: Request) {
  const k = await apiKeyUser(request);
  if (k instanceof Response) return k;
  const limit = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 20));
  const { data, error } = await createAdminClient()
    .from("live_sessions")
    .select("id, started_at, ended_at, duration_s, avg_kbps, peak_kbps, reconnects")
    .eq("user_id", k.userId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) return Response.json({ error: "unavailable" }, { status: 503 });
  return Response.json({ lives: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
