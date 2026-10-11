import type { NextRequest } from "next/server";
import { appUser, privateJson } from "@/lib/auth/app-api";
import { rotateRelayAction } from "@/app/(dashboard)/dashboard/relais/actions";

// POST /api/app/relays/:id/rotate : nouvelle clé (l'ancienne cesse de marcher tout de suite).
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const r = await rotateRelayAction((await params).id);
  return r.error ? privateJson({ error: r.error }, { status: 400 }) : privateJson({ ok: true });
}
