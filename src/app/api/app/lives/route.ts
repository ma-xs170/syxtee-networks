import type { NextRequest } from "next/server";
import { appUser, privateJson } from "@/lib/auth/app-api";
import { listSessions } from "@/lib/dashboard-overview";

// GET /api/app/lives?limit=50 : derniers directs du compte (durée, débit, reconnexions, courbe de débit).
export async function GET(request: NextRequest) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 30, 1), 100);
  return privateJson({ lives: await listSessions({ limit }) });
}
