"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteStreamKeys, hasCore } from "@/lib/core";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile, requireUser, safeNext } from "./dal";
import { profileSchema } from "./profileSchema";

export type FormState = { ok?: string; error?: string; fields?: Record<string, string> };

/** Enregistre le profil. `bienvenue` : première fois, marque le profil complété puis part vers le dashboard. */
export async function saveProfile(mode: "bienvenue" | "compte", _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(mode === "bienvenue" ? "/bienvenue" : "/compte");
  const raw = Object.fromEntries(["username", "bio", "country", "kick", "youtube", "tiktok", "instagram", "x"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = profileSchema.safeParse({ ...raw, show_on_site: formData.get("show_on_site") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide.", fields: raw };

  const profile = await getProfile();
  const values = parsed.data;
  // La case n'a d'effet qu'avec un Twitch vérifié (sinon la chaîne n'apparaîtrait pas).
  if (values.show_on_site && !profile?.twitch_id) return { error: "Lie d'abord ton Twitch pour afficher ta chaîne sur le site.", fields: raw };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...values, ...(mode === "bienvenue" ? { onboarded_at: new Date().toISOString() } : {}) })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { error: "Ce pseudo est déjà pris.", fields: raw };
    console.error("saveProfile", error.message);
    return { error: "Enregistrement impossible. Réessaie.", fields: raw };
  }
  revalidatePath("/", "layout");
  if (mode === "bienvenue") redirect(safeNext(String(formData.get("next") ?? "")));
  return { ok: "Profil enregistré." };
}

const AVATAR_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function uploadAvatar(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/compte");
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis une image." };
  const ext = AVATAR_TYPES[file.type];
  if (!ext) return { error: "Format accepté : JPG, PNG ou WebP." };
  if (file.size > 2 * 1024 * 1024) return { error: "Image trop lourde (2 Mo maximum)." };

  const supabase = await createClient();
  const bucket = supabase.storage.from("avatars");
  const { data: old } = await bucket.list(user.id);
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("uploadAvatar", error.message);
    return { error: "Envoi impossible. Réessaie." };
  }
  if (old?.length) await bucket.remove(old.map((f) => `${user.id}/${f.name}`));
  const url = bucket.getPublicUrl(path).data.publicUrl;
  // avatar_url n'est modifiable que par le serveur (jamais une URL libre saisie par l'utilisateur).
  await createAdminClient().from("profiles").update({ avatar_url: url }).eq("id", user.id);
  revalidatePath("/", "layout");
  return { ok: "Avatar mis à jour." };
}

/** Supprime le compte, le profil (cascade) et les avatars, puis déconnecte. */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/compte");
  if (String(formData.get("confirm") ?? "").trim() !== "SUPPRIMER") return { error: "Tape SUPPRIMER pour confirmer." };
  // Clés de stream retirées du relais d'abord : une URL qui aurait fuité cesse de marcher tout de suite.
  // En cas d'échec, le Core retire de toute façon les paires orphelines lors de son nettoyage horaire.
  if (hasCore) {
    try {
      await deleteStreamKeys(user.id);
    } catch (e) {
      console.error("deleteAccount : Core", e);
    }
  }
  const admin = createAdminClient();
  const { data: files } = await admin.storage.from("avatars").list(user.id);
  if (files?.length) await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteAccount", error.message);
    return { error: "Suppression impossible. Réessaie ou contacte-nous sur Discord." };
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/?compte=supprime");
}
