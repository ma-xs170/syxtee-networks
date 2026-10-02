"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { getThread } from "@/lib/support";
import { createAdminClient } from "@/lib/supabase/admin";

// Support côté client : ouvrir un ticket, écrire dans son fil (écrire dans un ticket résolu le rouvre), le clore.

export type SupportState = { error?: string };

const subject = z.string().trim().min(3, "Sujet : 3 caractères au moins.").max(120, "Sujet : 120 caractères au plus.");
const body = z.string().trim().min(1, "Écris ton message.").max(4000, "Message : 4000 caractères au plus.");

export async function createTicketAction(_prev: SupportState, form: FormData): Promise<SupportState> {
  const user = await requireUser("/dashboard/support");
  const parsed = z.object({ subject, body }).safeParse({ subject: form.get("subject"), body: form.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const db = createAdminClient();
  const open = await db.from("support_tickets").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "open");
  if ((open.count ?? 0) >= 5) return { error: "Tu as déjà 5 demandes en cours. Attends une réponse ou clos-en une." };
  const { data: ticket, error } = await db.from("support_tickets").insert({ user_id: user.id, subject: parsed.data.subject }).select("id").single();
  if (error || !ticket) {
    console.error("support_tickets", error?.message);
    return { error: "Envoi impossible pour le moment (migration 0026 appliquée ?)." };
  }
  await db.from("support_messages").insert({ ticket_id: ticket.id, author_id: user.id, from_staff: false, body: parsed.data.body });
  revalidatePath("/dashboard/support");
  redirect(`/dashboard/support/${ticket.id}`);
}

export async function replyAction(ticketId: string, _prev: SupportState, form: FormData): Promise<SupportState> {
  const user = await requireUser("/dashboard/support");
  const parsed = body.safeParse(form.get("body"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Écris ton message." };
  const thread = await getThread(ticketId, user.id);
  if (!thread) return { error: "Demande introuvable." };
  const db = createAdminClient();
  const { error } = await db.from("support_messages").insert({ ticket_id: ticketId, author_id: user.id, from_staff: false, body: parsed.data });
  if (error) return { error: "Envoi impossible pour le moment." };
  await db.from("support_tickets").update({ status: "open", resolved_at: null, last_from: "user", updated_at: new Date().toISOString() }).eq("id", ticketId);
  revalidatePath(`/dashboard/support/${ticketId}`);
  return {};
}

export async function closeTicketAction(ticketId: string) {
  const user = await requireUser("/dashboard/support");
  if (!(await getThread(ticketId, user.id))) return;
  const now = new Date().toISOString();
  await createAdminClient().from("support_tickets").update({ status: "resolved", resolved_at: now, updated_at: now }).eq("id", ticketId);
  revalidatePath(`/dashboard/support/${ticketId}`);
  revalidatePath("/dashboard/support");
}
