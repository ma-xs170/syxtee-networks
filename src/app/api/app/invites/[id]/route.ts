import type { NextRequest } from "next/server";
import { appUser, privateJson } from "@/lib/auth/app-api";
import { revokeInviteAction } from "@/app/(dashboard)/dashboard/invitations/actions";

// DELETE /api/app/invites/:id : retire l'invité (son lien cesse de marcher).
export async function DELETE(_r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const r = await revokeInviteAction((await params).id);
  return r.error ? privateJson({ error: r.error }, { status: 400 }) : privateJson({ ok: true });
}
