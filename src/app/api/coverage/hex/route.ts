import { publishedHexes } from "@/lib/coverage/public";

// GET /api/coverage/hex : tous les hexagones publiés de l'année (filtres opérateur / techno / période côté carte).
export async function GET() {
  const rows = await publishedHexes(365);
  return Response.json({ rows, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
