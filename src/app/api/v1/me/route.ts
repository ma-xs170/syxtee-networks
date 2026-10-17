import { apiKeyUser } from "@/lib/developers";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/me : compte de la clé d'API (identifiant, formule). Lecture seule.
export async function GET(request: Request) {
  const k = await apiKeyUser(request);
  if (k instanceof Response) return k;
  const { data } = await createAdminClient().from("profiles").select("id, plan, username").eq("id", k.userId).maybeSingle();
  return Response.json({ id: k.userId, plan: data?.plan ?? "free", username: data?.username ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}
