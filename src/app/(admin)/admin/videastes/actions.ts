"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/plan-admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Relecture des fiches vidéastes que la vérification automatique n'a pas tranchées. Permission « partners » ; chaque décision est journalisée.

export async function reviewCardAction(form: FormData) {
  const admin = await requireAdmin("partners");
  const id = String(form.get("id") ?? "");
  const approve = form.get("decision") === "approve";
  const note = String(form.get("note") ?? "").trim().slice(0, 300);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  if (!approve && !note) return; // un refus s'explique : le vidéaste lit ce motif
  const db = createAdminClient();
  const { error } = await db
    .from("videographer_cards")
    .update({ status: approve ? "published" : "rejected", review_note: approve ? null : note, reviewed_at: new Date().toISOString() })
    .eq("user_id", id)
    .eq("status", "pending");
  if (error) return;
  await db.from("notifications").insert({
    user_id: id,
    title: approve ? "Ta fiche est publiée" : "Ta fiche a été refusée",
    body: approve ? "Elle est visible dans l'annuaire des vidéastes." : `Motif : ${note}`.slice(0, 500),
  });
  await audit(admin.email!, approve ? "videaste.approve" : "videaste.reject", id, null, approve ? {} : { note });
  revalidatePath("/admin/videastes");
}
