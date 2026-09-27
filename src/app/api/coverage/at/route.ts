import { latLngToCell } from "h3-js";
import type { NextRequest } from "next/server";
import { best, hexesAt } from "@/lib/coverage/public";

// GET /api/coverage/at?lat=&lng= : zone (hexagone H3 rés. 9) à cette position, son score et le meilleur réseau.
// Utilisé par SYXTEE Cam (statut à l'ouverture, alertes pendant le live).
export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return Response.json({ error: "bad_position" }, { status: 400 });
  const h = latLngToCell(lat, lng, 9);
  const rows = await hexesAt([h]);
  const all = rows.find((r) => r.operator === "*" && r.tech === "*") ?? null;
  const top = best(rows);
  return Response.json(
    {
      h3: h,
      score: all?.score ?? null,
      median_kbps: all?.median_kbps ?? null,
      best: top ? { operator: top.operator, tech: top.tech, median_kbps: top.median_kbps } : null,
      operators: rows.filter((r) => r.operator !== "*").map((r) => ({ operator: r.operator, tech: r.tech, median_kbps: r.median_kbps, score: r.score })),
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
  );
}
