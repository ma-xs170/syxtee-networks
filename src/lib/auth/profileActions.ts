"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteAllRelays, deleteCoverage, hasCore } from "@/lib/core";
import { sendPasswordChanged } from "@/lib/email/account";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getUser, requireUser, safeNext } from "./dal";
import { AUTH_ERRORS } from "./errors";
import { passwordProblem } from "./password";
import { namesSchema, profileSchema } from "./profileSchema";
import { timezoneFor } from "@/lib/regions";
import { isPwned } from "./pwned";
import { allow } from "./rateLimit";

export type FormState = { ok?: string; error?: string; fields?: Record<string, string> };

/** Enregistre le profil. `bienvenue` : première fois, marque le profil complété puis part vers le dashboard. */
export async function saveProfile(mode: "bienvenue" | "compte", _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(mode === "bienvenue" ? "/bienvenue" : "/compte");
  const raw = Object.fromEntries(["bio", "country", "timezone", "twitch", "kick", "youtube", "tiktok", "instagram", "x"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = profileSchema.safeParse({ ...raw, show_on_site: formData.get("show_on_site") ?? "", show_first_name: formData.get("show_first_name") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide.", fields: raw };

  const profile = await getProfile();
  const values = parsed.data;
  // La case n'a d'effet qu'avec un pseudo Twitch (saisi ici, ou lié par connexion) : sinon la chaîne n'apparaîtrait pas.
  if (values.show_on_site && !(values.twitch || profile?.twitch_login || profile?.twitch_id)) return { error: "Indique ton pseudo Twitch pour afficher ta chaîne sur le site.", fields: raw };
  // Région obligatoire à l'inscription ; le fuseau doit appartenir au pays choisi.
  if (mode === "bienvenue" && !values.country) return { error: "Choisis ta région.", fields: raw };
  // À l'inscription : pseudo Twitch et pseudo YouTube obligatoires (le Twitch lié par connexion compte).
  if (mode === "bienvenue" && !(values.twitch || profile?.twitch_login)) return { error: "Indique ton pseudo Twitch.", fields: raw };
  if (mode === "bienvenue" && !values.youtube) return { error: "Indique ton pseudo YouTube.", fields: raw };
  const timezone = timezoneFor(values.country, String(formData.get("timezone") ?? ""));

  const supabase = await createClient();
  const extra = mode === "bienvenue" ? { onboarded_at: new Date().toISOString() } : {};
  let { error } = await supabase.from("profiles").update({ ...values, timezone, ...extra }).eq("id", user.id);
  // Colonne « twitch » absente (migration 0033 pas encore appliquée) : on enregistre le reste et on le dit.
  let twitchSkipped = false;
  if (error && (error.code === "42703" || error.code === "PGRST204") && /twitch/i.test(error.message)) {
    const { twitch: _skip, ...rest } = values;
    void _skip;
    twitchSkipped = true;
    ({ error } = await supabase.from("profiles").update({ ...rest, timezone, ...extra }).eq("id", user.id));
  }
  // Colonne « timezone » absente (migration 0028 pas encore appliquée) : on enregistre le reste sans le fuseau.
  if (error && (error.code === "42703" || error.code === "PGRST204") && /timezone/i.test(error.message)) {
    const { twitch: tw, ...noTwitch } = values;
    ({ error } = await supabase.from("profiles").update({ ...(twitchSkipped ? noTwitch : { ...noTwitch, twitch: tw }), ...extra }).eq("id", user.id));
  }
  if (error) {
    console.error("saveProfile", error.code, error.message);
    const why =
      error.code === "42501" ? "droits manquants sur la base : applique la migration 0033 en entier (ligne « grant update »)"
      : error.code === "23514" ? "une valeur est refusée par la base (pseudo : 3 à 25 lettres, chiffres ou _)"
      : error.code === "42703" || error.code === "PGRST204" ? "colonne absente de la base : applique les migrations 0028 et 0033"
      : error.code === "PGRST301" || /jwt/i.test(error.message) ? "session expirée : reconnecte-toi"
      : `code ${error.code ?? "inconnu"}`;
    return { error: `Enregistrement impossible (${why}).`, fields: raw };
  }
  revalidatePath("/", "layout");
  if (mode === "bienvenue") redirect(safeNext(String(formData.get("next") ?? "")));
  return twitchSkipped ? { ok: "Profil enregistré, sauf le pseudo Twitch : la base de données doit être mise à jour d'abord." } : { ok: "Profil enregistré." };
}

/** Message affiché pour une erreur Supabase sur profiles : la vraie raison, jamais un message générique. */
function namesError(e: { code?: string; message: string }) {
  if (e.code === "PGRST301" || e.code === "PGRST303" || /jwt/i.test(e.message)) return "Session expirée, reconnecte-toi.";
  if (e.code === "42501") return "Accès refusé à ton profil. Reconnecte-toi, puis réessaie.";
  if (e.code === "23514") return "Nom invalide : 1 à 50 caractères.";
  if (e.code === "42703" || e.code === "PGRST204") return "Base de données pas à jour (colonne prénom/nom absente). Préviens-nous sur Discord.";
  return `Enregistrement refusé par la base (${e.code ?? "erreur inconnue"}). Réessaie ou préviens-nous sur Discord.`;
}

/** Prénom + nom : modale des comptes existants, et Paramètres. Upsert : marche même sans ligne profiles. */
export async function saveNames(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = { first_name: String(formData.get("first_name") ?? ""), last_name: String(formData.get("last_name") ?? "") };
  const user = await getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi.", fields: raw };
  const parsed = namesSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nom invalide.", fields: raw };
  // Update de sa ligne (RLS). Pas d'upsert côté utilisateur : l'INSERT évaluerait le défaut support_id = new_support_id(),
  // fonction interdite aux comptes (0012) → 42501. Ligne absente : créée par le serveur, pour l'id vérifié de la session.
  const supabase = await createClient();
  let { data: rows, error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id).select("id");
  if (!error && !rows?.length) {
    ({ data: rows, error } = await createAdminClient().from("profiles").upsert({ id: user.id, ...parsed.data }, { onConflict: "id" }).select("id"));
  }
  if (error) {
    console.error("saveNames", { user: user.id, code: error.code, message: error.message, details: error.details, hint: error.hint });
    return { error: namesError(error), fields: raw };
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
  sendPasswordChanged(user.email);
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
