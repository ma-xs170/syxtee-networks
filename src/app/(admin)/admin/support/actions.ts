"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/plan-admin";
import { getThread, savePhotos } from "@/lib/support";
import { createAdminClient } from "@/lib/supabase/admin";

// Support côté équipe : répondre à un ticket (le client reçoit une notification dans sa cloche) et le clore ou le rouvrir.
// Tout admin (ADMIN_EMAILS, TOTP vérifié) peut répondre ; chaque réponse est journalisée avec l'adresse de l'admin.

export type StaffReplyState = { error?: string };

const body = z.string().trim().max(4000, "Réponse : 4000 caractères au plus.");

export async function staffReplyAction(ticketId: string, _prev: StaffReplyState, form: FormData): Promise<StaffReplyState> {
  const admin = await requireAdmin();
  const parsed = body.safeParse(form.get("body"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Écris ta réponse." };
  const withPhotos = form.getAll("photos").some((f) => f instanceof File && f.size > 0);
  if (!parsed.data && !withPhotos) return { error: "Écris ta réponse ou ajoute une photo." };
  const thread = await getThread(ticketId);
  if (!thread) return { error: "Demande introuvable." };
  const photos = await savePhotos(ticketId, form);
  if ("error" in photos) return { error: photos.error };
  const db = createAdminClient();
  const { error } = await db.from("support_messages").insert({ ticket_id: ticketId, author_id: admin.id, from_staff: true, body: parsed.data, attachments: photos.attachments });
  if (error) return { error: "Envoi impossible." };
  const now = new Date().toISOString();
  await db
    .from("support_tickets")
    .update({ last_from: "staff", updated_at: now, ...(thread.ticket.first_reply_at ? {} : { first_reply_at: now }) })
    .eq("id", ticketId);
  await db.from("notifications").insert({ user_id: thread.ticket.user_id, title: "Réponse à ta demande de support", body: thread.ticket.subject });
  await audit(admin.email!, "support.reply", thread.ticket.user_id, null, { ticket: ticketId });
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
  return {};
}

export async function setTicketStatusAction(ticketId: string, status: "open" | "resolved") {
  const admin = await requireAdmin();
  const thread = await getThread(ticketId);
  if (!thread) return;
  const now = new Date().toISOString();
  await createAdminClient()
    .from("support_tickets")
    .update(status === "resolved" ? { status, resolved_at: now, updated_at: now } : { status, resolved_at: null, updated_at: now })
    .eq("id", ticketId);
  await audit(admin.email!, `support.${status}`, thread.ticket.user_id, null, { ticket: ticketId });
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
}
