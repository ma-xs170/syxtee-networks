import type { NextRequest } from "next/server";
import { appUser, privateJson, readJson } from "@/lib/auth/app-api";
import { getPlan } from "@/lib/auth/plan";
import { listInvites } from "@/lib/core";
import { requireOwner } from "@/lib/workspace";
import { createInviteAction } from "@/app/(dashboard)/dashboard/invitations/actions";

// GET /api/app/invites : invités au contrôle à distance.
export async function GET() {
  const u = await appUser();
  if (u instanceof Response) return u;
  const owner = await requireOwner("/dashboard/invitations");
  const [invites, plan] = await Promise.all([listInvites(owner.id).catch(() => null), getPlan()]);
  return privateJson({ invites: invites ?? [], max: Number.isFinite(plan.maxInvites) ? plan.maxInvites : null, plan: plan.name });
}

// POST /api/app/invites { label, email, level: "view"|"scenes"|"full", expiresHours } : crée l'invitation (le lien est aussi envoyé par e-mail).
export async function POST(request: NextRequest) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const b = (await readJson(request)) as { label?: string; email?: string; level?: "view" | "scenes" | "full"; expiresHours?: number } | null;
  if (!b?.label || !b.email || !b.level) return privateJson({ error: "Champs manquants." }, { status: 400 });
  const r = await createInviteAction({ label: b.label, email: b.email, level: b.level, deviceId: "", expiresHours: b.expiresHours ?? 0 });
  return r.error ? privateJson({ error: r.error }, { status: 400 }) : privateJson({ url: r.url, emailed: r.emailed, note: r.emailNote ?? null });
}
