import type { NextRequest } from "next/server";
import { appUser, privateJson, redirectTarget, readJson } from "@/lib/auth/app-api";
import { getThread } from "@/lib/support";
import { categoryLabel } from "@/lib/support-categories";
import { deleteTicketAction, replyAction } from "@/app/(dashboard)/dashboard/aide/actions";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/app/support/:id : fil de la demande.
export async function GET(_r: NextRequest, { params }: Ctx) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const t = await getThread((await params).id, u.id);
  if (!t) return privateJson({ error: "Demande introuvable." }, { status: 404 });
  return privateJson({ ticket: { ...t.ticket, category_label: categoryLabel(t.ticket.category) }, messages: t.messages });
}

// POST /api/app/support/:id { body } : répond (rouvre une demande résolue).
export async function POST(request: NextRequest, { params }: Ctx) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const b = (await readJson(request)) as { body?: string } | null;
  const form = new FormData();
  form.set("body", b?.body ?? "");
  const r = await replyAction((await params).id, {}, form);
  return r.error ? privateJson({ error: r.error }, { status: 400 }) : privateJson({ ok: true });
}

// DELETE /api/app/support/:id : supprime la demande.
export async function DELETE(_r: NextRequest, { params }: Ctx) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const { id } = await params;
  await redirectTarget(() => deleteTicketAction(id));
  return privateJson({ ok: true });
}
