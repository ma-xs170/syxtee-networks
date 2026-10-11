import type { NextRequest } from "next/server";
import { appUser, privateJson } from "@/lib/auth/app-api";
import { isRange } from "@/lib/dashboard-data";
import { getStats } from "@/lib/dashboard-overview";
import { accountTimezone } from "@/lib/regions";

// GET /api/app/stats?range=7d|30d : statistiques globales du compte.
export async function GET(request: NextRequest) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const r = request.nextUrl.searchParams.get("range") ?? "7d";
  if (!isRange(r)) return privateJson({ error: "bad_range" }, { status: 400 });
  return privateJson(await getStats(r, accountTimezone(u.profile)));
}
