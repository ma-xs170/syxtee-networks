"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/admin";
import { audit } from "@/lib/plan-admin";
import { redirect } from "next/navigation";
import { addMessage, deleteTicket, getThread, savePhotos } from "@/lib/support";
import { ROLE_META, signatureOf } from "@/lib/staff";
import { staffCards } from "@/lib/staff-data";
import { createAdminClient } from "@/lib/supabase/admin";

// Support côté équipe : répondre à un ticket (le client reçoit une notification dans sa cloche) et le clore ou le rouvrir.
// Tout membre avec la permission « support » (TOTP vérifié) peut répondre ; chaque réponse est journalisée avec son adresse.
// Prise en charge : le premier agent qui répond (ou clique « Prendre en charge ») devient l'agent du ticket ; le client le voit
// (prénom, rôle) et chaque message de l'agent porte sa signature. Un agent « Support » ne répond pas à un ticket d'un autre agent.

export type StaffReplyState = { error?: string };

const body = z.string().trim().max(4000, "Réponse : 4000 caractères au plus.");

/** Prend en charge le ticket : agent assigné, ligne d'information pour le client et notification. */
async function claim(ticketId: string, clientId: string, agentId: string, role: Parameters<typeof signatureOf>[1]) {
  const db = createAdminClient();
  const card = (await staffCards([agentId])).get(agentId);
  const { error } = await db.from("support_tickets").update({ assigned_to: agentId, assigned_at: new Date().toISOString() }).eq("id", ticketId);
  if (error) return console.error("assign", error.message);
  const team = role === "support" ? "de l'Équipe Support" : "de l'Équipe SYXTEE";
  await addMessage({ ticket_id: ticketId, author_id: null, from_staff: true, kind: "system", body: `${card?.firstName ?? "Un agent"}, ${team}, a pris en charge votre demande.` });
  await db.from("notifications").insert({ user_id: clientId, title: "Ta demande est prise en charge", body: `${card?.firstName ?? "Un agent"} s'occupe de ta demande de support.` });
}

export async function staffReplyAction(ticketId: string, _prev: StaffReplyState, form: FormData): Promise<StaffReplyState> {
  const { user: admin, access } = await requireStaff("support");
  const parsed = body.safeParse(form.get("body"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Écris ta réponse." };
  const withPhotos = form.getAll("photos").some((f) => f instanceof File && f.size > 0);
  if (!parsed.data && !withPhotos) return { error: "Écris ta réponse ou ajoute une photo." };
  const thread = await getThread(ticketId);
  if (!thread) return { error: "Demande introuvable." };
  const mine = thread.ticket.assigned_to === admin.id;
  if (thread.ticket.assigned_to && !mine && access.role === "support") {
    const other = (await staffCards([thread.ticket.assigned_to])).get(thread.ticket.assigned_to);
    return { error: `Cette demande est prise en charge par ${other?.firstName ?? "un autre agent"}.` };
  }
  const photos = await savePhotos(ticketId, form);
  if ("error" in photos) return { error: photos.error };
  if (!thread.ticket.assigned_to) await claim(ticketId, thread.ticket.user_id, admin.id, access.role);
  const card = (await staffCards([admin.id])).get(admin.id);
  const db = createAdminClient();
  const error = await addMessage({ ticket_id: ticketId, author_id: admin.id, from_staff: true, body: parsed.data, attachments: photos.attachments, signature: signatureOf(card?.firstName, access.role) });
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

/** Bouton « Prendre en charge » : l'agent connecté devient l'agent du ticket (un agent Support ne prend pas celui d'un autre). */
export async function claimTicketAction(ticketId: string) {
  const { user: admin, access } = await requireStaff("support");
  const thread = await getThread(ticketId);
  if (!thread || thread.ticket.assigned_to === admin.id) return;
  if (thread.ticket.assigned_to && access.role === "support") return;
  await claim(ticketId, thread.ticket.user_id, admin.id, access.role);
  await audit(admin.email!, "support.claim", thread.ticket.user_id, null, { ticket: ticketId, role: ROLE_META[access.role].label });
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
}

/** Libère le ticket (l'agent assigné, un administrateur ou le propriétaire) : il repasse « en attente d'un agent ». */
export async function releaseTicketAction(ticketId: string) {
  const { user: admin, access } = await requireStaff("support");
  const thread = await getThread(ticketId);
  if (!thread?.ticket.assigned_to) return;
  if (thread.ticket.assigned_to !== admin.id && access.role !== "owner" && access.role !== "admin") return;
  await createAdminClient().from("support_tickets").update({ assigned_to: null, assigned_at: null }).eq("id", ticketId);
  await audit(admin.email!, "support.release", thread.ticket.user_id, null, { ticket: ticketId });
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
}

export async function setTicketStatusAction(ticketId: string, status: "open" | "resolved") {
  const admin = await requireAdmin("support");
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

/** L'admin supprime une demande (journalisé). */
export async function deleteTicketStaffAction(ticketId: string) {
  const admin = await requireAdmin("support");
  const thread = await getThread(ticketId);
  if (!thread) return;
  await deleteTicket(ticketId);
  await audit(admin.email!, "support.delete", thread.ticket.user_id, null, { ticket: ticketId, subject: thread.ticket.subject });
  revalidatePath("/admin/support");
  redirect("/admin/support");
}
