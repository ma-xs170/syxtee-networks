"use server";

import { revalidatePath } from "next/cache";
import { displayNameSchema, getMyAffiliate, slugSchema } from "@/lib/affiliates";
import { createAdminClient } from "@/lib/supabase/admin";

// Espace Affilié : l'affilié change son pseudo et le nom de son lien. Le serveur retrouve l'affilié depuis la session, jamais depuis le formulaire.
export type AffiliateSettingsState = { ok?: string; error?: string };

export async function saveAffiliateAction(_prev: AffiliateSettingsState, form: FormData): Promise<AffiliateSettingsState> {
  const me = await getMyAffiliate();
  if (!me) return { error: "Espace Affilié introuvable." };
  const pseudo = displayNameSchema.safeParse(form.get("pseudo"));
  const slug = slugSchema.safeParse(form.get("slug"));
  if (!pseudo.success) return { error: pseudo.error.issues[0]?.message ?? "Pseudo invalide." };
  if (!slug.success) return { error: slug.error.issues[0]?.message ?? "Nom d'URL invalide." };
  const { error } = await createAdminClient().from("affiliates").update({ display_name: pseudo.data, slug: slug.data }).eq("id", me.id);
  if (error) return { error: error.code === "23505" ? "Ce nom d'URL est déjà pris." : "Enregistrement impossible. Réessaie." };
  revalidatePath("/dashboard/affilie");
  revalidatePath(`/s/${me.slug}`);
  revalidatePath(`/s/${slug.data}`);
  return { ok: "Enregistré." };
}

/** Première ouverture de l'espace : la pastille « Nouveau » du menu disparaît. */
export async function markAffiliateSeenAction() {
  const me = await getMyAffiliate();
  if (!me || me.seen_at) return;
  await createAdminClient().from("affiliates").update({ seen_at: new Date().toISOString() }).eq("id", me.id).is("seen_at", null);
  revalidatePath("/dashboard", "layout");
}
