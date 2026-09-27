import { NextResponse, type NextRequest } from "next/server";
import { publishAntennes } from "@/lib/antennes/publish.ts";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Import quotidien de la carte des antennes (Vercel Cron, voir vercel.json).
// Vercel envoie « Authorization: Bearer <CRON_SECRET> » ; tout autre appel est refusé.
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasAdmin) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  try {
    const res = await publishAntennes(createAdminClient());
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    console.error("cron antennes", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
