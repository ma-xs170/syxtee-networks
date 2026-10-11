import type { NextRequest } from "next/server";
import { appUser, privateJson } from "@/lib/auth/app-api";
import { closeTicketAction } from "@/app/(dashboard)/dashboard/support/actions";

// POST /api/app/support/:id/close : marque la demande comme résolue.
export async function POST(_r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await appUser();
  if (u instanceof Response) return u;
  await closeTicketAction((await params).id);
  return privateJson({ ok: true });
}
