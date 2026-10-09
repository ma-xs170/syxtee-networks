"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { addMessage, deleteTicket, getThread, savePhotos, WAITING_AGENT_TEXT } from "@/lib/support";
import { CATEGORY_FORMS, isCategory } from "@/lib/support-categories";
import { createAdminClient } from "@/lib/supabase/admin";

// Support côté client : ouvrir un ticket, écrire dans son fil (écrire dans un ticket résolu le rouvre), le clore.

export type SupportState = { error?: string };

const subject = z.string().trim().min(3, "Sujet : 3 caractères au moins.").max(120, "Sujet : 120 caractères au plus.");
const body = z.string().trim().max(4000, "Message : 4000 caractères au plus.");
const hasPhotos = (form: FormData) => form.getAll("photos").some((f) => f instanceof File && f.size > 0);

export async function createTicketAction(_prev: SupportState, form: FormData): Promise<SupportState> {
  const user = await requireUser("/dashboard/support");
  const parsed = z.object({ subject, body }).safeParse({ subject: form.get("subject"), body: form.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const category = form.get("category");
  if (!isCategory(category)) return { error: "Choisis une catégorie." };
  // Champs propres à la catégorie : validés contre la liste, puis ajoutés en tête du message.
  const details: string[] = [];
  for (const f of CATEGORY_FORMS[category].fields) {
    const v = String(form.get(`f_${f.name}`) ?? "").trim().slice(0, 200);
    if (!v) {
      if (f.required) return { error: `${f.label} : obligatoire.` };
      continue;
    }
    if (f.type === "select" && !(f.options ?? []).includes(v)) return { error: `${f.label} : choix invalide.` };
    details.push(`${f.label} : ${v}`);
  }
  const fullBody = [details.join("\n"), parsed.data.body].filter(Boolean).join("\n\n").slice(0, 4000);
  if (!parsed.data.body && !hasPhotos(form)) return { error: "Écris ton message ou ajoute une photo." };
  const db = createAdminClient();
  const open = await db.from("support_tickets").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "open");
  if ((open.count ?? 0) >= 5) return { error: "Tu as déjà 5 demandes en cours. Attends une réponse ou clos-en une." };
  const { data: ticket, error } = await db.from("support_tickets").insert({ user_id: user.id, subject: parsed.data.subject, category }).select("id").single();
  if (error || !ticket) {
    console.error("support_tickets", error?.message);
    return { error: "Envoi impossible pour le moment (migration 0026 appliquée ?)." };
  }
  const photos = await savePhotos(ticket.id, form);
  if ("error" in photos) {
    await db.from("support_tickets").delete().eq("id", ticket.id);
    return { error: photos.error };
  }
  await addMessage({ ticket_id: ticket.id, author_id: user.id, from_staff: false, body: fullBody, attachments: photos.attachments });
  // Message automatique : le client sait qu'on cherche un agent (le suivant, signé, arrive à la prise en charge).
  await addMessage({ ticket_id: ticket.id, author_id: null, from_staff: true, body: WAITING_AGENT_TEXT, kind: "system" });
  revalidatePath("/dashboard/support");
  redirect(`/dashboard/support/${ticket.id}`);
}

export async function replyAction(ticketId: string, _prev: SupportState, form: FormData): Promise<SupportState> {
  const user = await requireUser("/dashboard/support");
  const parsed = body.safeParse(form.get("body"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Écris ton message." };
  if (!parsed.data && !hasPhotos(form)) return { error: "Écris ton message ou ajoute une photo." };
  const thread = await getThread(ticketId, user.id);
  if (!thread) return { error: "Demande introuvable." };
  const photos = await savePhotos(ticketId, form);
  if ("error" in photos) return { error: photos.error };
  const db = createAdminClient();
  const { error } = await db.from("support_messages").insert({ ticket_id: ticketId, author_id: user.id, from_staff: false, body: parsed.data, attachments: photos.attachments });
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

/** Le membre supprime sa propre demande (messages et photos compris). */
export async function deleteTicketAction(ticketId: string) {
  const user = await requireUser("/dashboard/support");
  if (!(await getThread(ticketId, user.id))) return;
  await deleteTicket(ticketId);
  revalidatePath("/dashboard/support");
  redirect("/dashboard/support");
}
