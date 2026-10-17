"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/plan-admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Réseau de sponsors : valider une candidature, créer ou couper une campagne, l'attribuer à un streamer accepté. Journal d'audit à chaque action.

export async function setApplicationAction(form: FormData) {
  const admin = await requireAdmin("partners");
  const parsed = z.object({ id: z.uuid(), status: z.enum(["approved", "rejected", "pending"]) }).safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return;
  const { error } = await createAdminClient()
    .from("sponsor_applications")
    .update({ status: parsed.data.status, handled_at: parsed.data.status === "pending" ? null : new Date().toISOString(), handled_by: parsed.data.status === "pending" ? null : admin.email })
    .eq("id", parsed.data.id);
  if (error) return console.error("sponsor_applications", error.message);
  await audit(admin.email!, `sponsor.application.${parsed.data.status}`, null, null, { application: parsed.data.id });
  revalidatePath("/admin/sponsors");
}

const httpUrl = z.string().trim().max(300).refine((v) => v === "" || /^https?:\/\//i.test(v), "Lien en http(s)://");

export async function createCampaignAction(form: FormData) {
  const admin = await requireAdmin("partners");
  const parsed = z
    .object({ brand: z.string().trim().min(1).max(80), category: z.string().trim().max(40), pinned_message: z.string().trim().max(300), link: httpUrl, code: z.string().trim().max(40) })
    .safeParse({ brand: form.get("brand"), category: form.get("category") ?? "", pinned_message: form.get("pinned_message") ?? "", link: form.get("link") ?? "", code: form.get("code") ?? "" });
  if (!parsed.success) return;
  const { data, error } = await createAdminClient().from("sponsor_campaigns").insert(parsed.data).select("id").single();
  if (error) return console.error("sponsor_campaigns", error.message);
  await audit(admin.email!, "sponsor.campaign.create", null, null, { campaign: data.id });
  revalidatePath("/admin/sponsors");
}

export async function toggleCampaignAction(form: FormData) {
  const admin = await requireAdmin("partners");
  const parsed = z.object({ id: z.uuid(), active: z.enum(["true", "false"]) }).safeParse({ id: form.get("id"), active: form.get("active") });
  if (!parsed.success) return;
  const { error } = await createAdminClient().from("sponsor_campaigns").update({ active: parsed.data.active === "true" }).eq("id", parsed.data.id);
  if (error) return console.error("sponsor_campaigns", error.message);
  await audit(admin.email!, "sponsor.campaign.toggle", null, null, { campaign: parsed.data.id, active: parsed.data.active });
  revalidatePath("/admin/sponsors");
}

export async function deleteCampaignAction(form: FormData) {
  const admin = await requireAdmin("partners");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  const { error } = await createAdminClient().from("sponsor_campaigns").delete().eq("id", id.data);
  if (error) return console.error("sponsor_campaigns", error.message);
  await audit(admin.email!, "sponsor.campaign.delete", null, null, { campaign: id.data });
  revalidatePath("/admin/sponsors");
}

/** Attribue une campagne à un streamer accepté (par e-mail de candidature). */
export async function assignCampaignAction(form: FormData) {
  const admin = await requireAdmin("partners");
  const parsed = z.object({ id: z.uuid(), email: z.string().trim().toLowerCase().min(3) }).safeParse({ id: form.get("id"), email: form.get("email") });
  if (!parsed.success) return;
  const db = createAdminClient();
  const { data: app } = await db.from("sponsor_applications").select("user_id").ilike("email", parsed.data.email).eq("status", "approved").maybeSingle();
  if (!app) return;
  const { error } = await db.from("sponsor_assignments").upsert({ campaign_id: parsed.data.id, user_id: app.user_id }, { onConflict: "campaign_id,user_id" });
  if (error) return console.error("sponsor_assignments", error.message);
  await audit(admin.email!, "sponsor.campaign.assign", null, null, { campaign: parsed.data.id, user: app.user_id });
  revalidatePath("/admin/sponsors");
}
