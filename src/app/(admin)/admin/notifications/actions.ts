"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { listAccounts } from "@/lib/admin-data";
import { audit } from "@/lib/plan-admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Envoi d'une notification (admin) : à tous les comptes, ou à un seul par ID support. Journalisé.

export type NotifState = { ok?: string; error?: string };

const input = z.object({
  title: z.string().trim().min(1, "Titre obligatoire.").max(80, "Titre : 80 caractères au plus."),
  body: z.string().trim().max(500, "Message : 500 caractères au plus."),
  email: z.string().trim().toLowerCase().max(200),
});

export async function sendNotificationAction(_prev: NotifState, form: FormData): Promise<NotifState> {
  const admin = await requireAdmin("notifications");
  const parsed = input.safeParse({ title: form.get("title"), body: form.get("body") ?? "", email: form.get("email") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { title, body, email } = parsed.data;
  const db = createAdminClient();
  let userId: string | null = null;
  if (email) {
    const { rows } = await listAccounts({ q: email, perPage: 20 });
    const found = rows.find((r) => r.email?.toLowerCase() === email);
    if (!found) return { error: "Aucun compte avec cette adresse e-mail." };
    userId = found.id;
  }
  const { error } = await db.from("notifications").insert({ user_id: userId, title, body });
  if (error) {
    console.error("notifications", error.message);
    return { error: "Envoi impossible (migration 0024 appliquée ?)." };
  }
  await audit(admin.email!, "notification.send", userId, null, { title, to: userId ? email : "tous" });
  revalidatePath("/admin/notifications");
  return { ok: userId ? "Notification envoyée au compte." : "Notification envoyée à tous les comptes." };
}

export async function deleteNotificationAction(form: FormData) {
  const admin = await requireAdmin("notifications");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  await createAdminClient().from("notifications").delete().eq("id", id.data);
  await audit(admin.email!, "notification.delete", null, { id: id.data }, null);
  revalidatePath("/admin/notifications");
}
