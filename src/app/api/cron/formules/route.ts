import { NextResponse, type NextRequest } from "next/server";
import { runPlanExpiry } from "@/lib/plan-admin";
import { hasAdmin } from "@/lib/supabase/admin";

// Tâche quotidienne des formules (Vercel Cron, voir vercel.json) : échéances → Gratuit, rappels à J-7.
// Vercel envoie « Authorization: Bearer <CRON_SECRET> » ; tout autre appel est refusé.
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasAdmin) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  try {
    return NextResponse.json({ ok: true, ...(await runPlanExpiry()) });
  } catch (e) {
    console.error("cron formules", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
