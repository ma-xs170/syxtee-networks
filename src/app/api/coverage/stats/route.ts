import { coverageStats } from "@/lib/coverage/public";

export async function GET() {
  return Response.json(await coverageStats(), { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
