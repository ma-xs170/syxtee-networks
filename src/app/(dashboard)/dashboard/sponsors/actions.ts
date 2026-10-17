"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { SPONSOR_CATEGORIES } from "@/lib/sponsors";
import { createAdminClient } from "@/lib/supabase/admin";

// Candidature au réseau de sponsors : une par compte. Refusée, elle peut être renvoyée.

const input = z.object({
  categories: z.array(z.enum(SPONSOR_CATEGORIES)).max(SPONSOR_CATEGORIES.length),
  message: z.string().trim().max(1000),
});

export type SponsorApplyState = { error?: string };

export async function applySponsorAction(_prev: SponsorApplyState, form: FormData): Promise<SponsorApplyState> {
  const user = await requireUser("/dashboard/sponsors");
  const parsed = input.safeParse({ categories: form.getAll("categories"), message: form.get("message") ?? "" });
  if (!parsed.success) return { error: "Candidature invalide." };
  const db = createAdminClient();
  const { data: existing } = await db.from("sponsor_applications").select("status").eq("user_id", user.id).maybeSingle();
  if (existing && existing.status !== "rejected") return { error: "Candidature déjà envoyée." };
  const { error } = await db.from("sponsor_applications").upsert(
    { user_id: user.id, email: user.email ?? "", categories: parsed.data.categories, message: parsed.data.message, status: "pending", handled_at: null, handled_by: null },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("sponsor_applications", error.message);
    return { error: "Envoi impossible, réessaie dans un instant." };
  }
  revalidatePath("/dashboard/sponsors");
  return {};
}
