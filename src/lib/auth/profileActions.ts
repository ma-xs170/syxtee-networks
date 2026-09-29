"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteAllRelays, deleteCoverage, hasCore } from "@/lib/core";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile, requireUser, safeNext } from "./dal";
import { AUTH_ERRORS } from "./errors";
import { passwordProblem } from "./password";
import { namesSchema, profileSchema } from "./profileSchema";
import { isPwned } from "./pwned";
import { allow } from "./rateLimit";

export type FormState = { ok?: string; error?: string; fields?: Record<string, string> };

/** Enregistre le profil. `bienvenue` : première fois, marque le profil complété puis part vers le dashboard. */
export async function saveProfile(mode: "bienvenue" | "compte", _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(mode === "bienvenue" ? "/bienvenue" : "/compte");
  const raw = Object.fromEntries(["bio", "country", "kick", "youtube", "tiktok", "instagram", "x"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = profileSchema.safeParse({ ...raw, show_on_site: formData.get("show_on_site") ?? "", show_first_name: formData.get("show_first_name") ?? "" });
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
    console.error("saveProfile", error.message);
    return { error: "Enregistrement impossible. Réessaie.", fields: raw };
  }
  revalidatePath("/", "layout");
  if (mode === "bienvenue") redirect(safeNext(String(formData.get("next") ?? "")));
  return { ok: "Profil enregistré." };
}

/** Prénom + nom : modale obligatoire des comptes existants, et Paramètres. */
export async function saveNames(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard");
  const raw = { first_name: String(formData.get("first_name") ?? ""), last_name: String(formData.get("last_name") ?? "") };
  const parsed = namesSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide.", fields: raw };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) {
    console.error("saveNames", error.message);
    return { error: "Enregistrement impossible. Réessaie.", fields: raw };
  }
  revalidatePath("/", "layout");
  return { ok: "Nom enregistré." };
}

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

/** Changement d'email : Supabase envoie un lien à l'ancienne ET à la nouvelle adresse ; rien ne change avant les deux clics. */
export async function changeEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/parametres");
  const raw = String(formData.get("email") ?? "");
  const email = z.string().trim().toLowerCase().pipe(z.email()).safeParse(raw);
  if (!email.success) return { error: AUTH_ERRORS["email-invalide"], fields: { email: raw } };
  if (email.data === user.email) return { error: "C'est déjà ton adresse actuelle.", fields: { email: raw } };
  if (!(await allow(`email-change:${user.id}`, 3, 3600))) return { error: AUTH_ERRORS.limite, fields: { email: raw } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: email.data }, { emailRedirectTo: `${await origin()}/auth/confirm?next=/dashboard/parametres` });
  if (error) {
    // Adresse déjà utilisée par un autre compte : même réponse (pas de fuite).
    if (error.code !== "email_exists") {
      console.error("changeEmail", error.code, error.message);
      return { error: "Changement impossible. Réessaie.", fields: { email: raw } };
    }
  }
  return { ok: `Confirme le changement depuis les deux boîtes mail : ${user.email} et ${email.data}.` };
}

/** Nouveau mot de passe depuis les Paramètres : l'ancien est vérifié d'abord (session volée ≠ compte volé). */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/parametres");
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("password") ?? "");
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== String(formData.get("password_confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };
  if (!(await allow(`password-change:${user.id}`, 5, 900))) return { error: AUTH_ERRORS["limite-connexion"] };

  // Vérification de l'ancien avec un client sans cookies : la session du navigateur n'est pas touchée.
  const check = createStatelessClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await check.auth.signInWithPassword({ email: user.email ?? "", password: current });
  if (wrong) return { error: "Mot de passe actuel incorrect. Pas de mot de passe (ancien compte Twitch, Discord ou Google) ? Utilise « Mot de passe oublié »." };
  await check.auth.signOut({ scope: "local" });

  if (await isPwned(next)) return { error: AUTH_ERRORS["mdp-fuite"] };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    if (error.code === "same_password") return { error: "Choisis un mot de passe différent de l'ancien." };
    console.error("changePassword", error.code, error.message);
    return { error: "Enregistrement impossible. Réessaie." };
  }
  return { ok: "Mot de passe modifié." };
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
      await deleteAllRelays(user.id);
      await deleteCoverage(user.id); // mesures de couverture (anonymes, mais rattachables par le Core)
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
