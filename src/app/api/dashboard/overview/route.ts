import type { NextRequest } from "next/server";
import { getPlan } from "@/lib/auth/plan";
import { getProfile, getUser } from "@/lib/auth/dal";
import { isRange } from "@/lib/dashboard-data";
import { getOverview } from "@/lib/dashboard-overview";

// GET /api/dashboard/overview?range=7d|30d : tout ce qu'affiche la vue d'ensemble, en une requête.
// Données privées : cache 30 s côté serveur (par utilisateur) et dans le navigateur seulement.
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const profile = await getProfile();
  if (!profile) return Response.json({ error: "no_profile" }, { status: 403 });
  const param = request.nextUrl.searchParams.get("range") ?? "7d";
  if (!isRange(param)) return Response.json({ error: "bad_range" }, { status: 400 });
  const data = await getOverview(user.id, profile, param, await getPlan());
  return Response.json(data, { headers: { "Cache-Control": "private, max-age=30" } });
}
