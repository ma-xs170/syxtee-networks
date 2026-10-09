"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/plan-admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Demandes de devis : changer l'état (nouvelle, répondue, close) ou supprimer. Chaque action va au journal d'audit.

const input = z.object({ id: z.uuid(), status: z.enum(["new", "answered", "closed"]) });

export async function setQuoteStatusAction(form: FormData) {
  const admin = await requireAdmin("access");
  const parsed = input.safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return;
  const { error } = await createAdminClient()
    .from("quote_requests")
    .update({ status: parsed.data.status, handled_at: parsed.data.status === "new" ? null : new Date().toISOString(), handled_by: parsed.data.status === "new" ? null : admin.email })
    .eq("id", parsed.data.id);
  if (error) return console.error("quote_requests", error.message);
  await audit(admin.email!, `quote.${parsed.data.status}`, null, null, { request: parsed.data.id });
  revalidatePath("/admin/devis");
}

export async function deleteQuoteAction(form: FormData) {
  const admin = await requireAdmin("access");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  const { error } = await createAdminClient().from("quote_requests").delete().eq("id", id.data);
  if (error) return console.error("quote_requests", error.message);
  await audit(admin.email!, "quote.delete", null, null, { request: id.data });
  revalidatePath("/admin/devis");
}
