import { gridDisk, latLngToCell } from "h3-js";
import type { NextRequest } from "next/server";
import { hexesAt } from "@/lib/coverage/public";

// GET /api/coverage/around?lat=&lng= : hexagones rés. 9 (couche 4G/5G, tous opérateurs) dans un rayon d'~2 km,
// pour la mini-carte du Scanner réseau. Les zones sans mesure publiée ne sont pas renvoyées (« inconnues »).
export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return Response.json({ error: "bad_position" }, { status: 400 });
  const cells = gridDisk(latLngToCell(lat, lng, 9), 6);
  const rows = (await hexesAt(cells)).filter((r) => r.operator === "*" && r.tech === "*");
  return Response.json(
    { cells: rows.map((r) => ({ h: r.h3_index, score: r.score, reliability: r.reliability })) },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
  );
}
