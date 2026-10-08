"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { afterLogin } from "@/lib/auth/afterLogin";
import { getUser, safeNext } from "@/lib/auth/dal";
import { AUTH_ERRORS, mapSupabaseError } from "@/lib/auth/errors";
import { checkNewDevice, sendPasswordChanged } from "@/lib/email/account";
import { passwordProblem } from "@/lib/auth/password";
import { personName } from "@/lib/auth/profileSchema";
import { isPwned } from "@/lib/auth/pwned";
import { isApprovedEmail } from "@/lib/access";
import { isManagedEmail, LOGIN_RE, loginToEmail, managedOf } from "@/lib/managed";
import { createAdminClient } from "@/lib/supabase/admin";
import { allow, clientIp } from "@/lib/auth/rateLimit";
import { clearRecovery, hasRecovery } from "@/lib/auth/recovery";
import { hasSupabase } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// Connexion par email + mot de passe (Supabase Auth). Twitch ne sert plus qu'à lier sa chaîne (Profil).
// Aucun message ne révèle si une adresse a un compte : inscription et « mot de passe oublié » répondent pareil.

async function origin() {
  const h = await headers();
  const o = h.get("origin");
  if (o) return o;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}

const confirmUrl = async (next: string) => `${await origin()}/auth/confirm${next ? `?next=${encodeURIComponent(next)}` : ""}`;

export type AuthState =
  | { status: "idle" }
  | { status: "sent"; email: string; at: number }
  | { status: "error"; message: string; fields?: Record<string, string>; code?: string };

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const nameSchema = personName;

const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const fail = (message: string, fields?: Record<string, string>, code?: string): AuthState => ({ status: "error", message, fields, code });

/** Inscription : prénom, nom, email, mot de passe. Le compte n'est actif qu'après le clic dans l'email. */
export async function signUp(_prev: AuthState, f: FormData): Promise<AuthState> {
  const fields = { first_name: str(f, "first_name"), last_name: str(f, "last_name"), email: str(f, "email") };
  const first = nameSchema("Prénom").safeParse(fields.first_name);
  if (!first.success) return fail(first.error.issues[0].message, fields);
  const last = nameSchema("Nom").safeParse(fields.last_name);
  if (!last.success) return fail(last.error.issues[0].message, fields);
  const email = emailSchema.safeParse(fields.email);
  if (!email.success) return fail(AUTH_ERRORS["email-invalide"], fields);
  const password = str(f, "password");
  const problem = passwordProblem(password);
  if (problem) return fail(problem, fields);
  if (password !== str(f, "password_confirm")) return fail("Les deux mots de passe ne correspondent pas.", fields);
  if (f.get("cgu") !== "on") return fail("Accepte les Conditions d'utilisation et la Politique de confidentialité.", fields);
  if (!hasSupabase) return fail(AUTH_ERRORS.indisponible, fields);
  // Inscription par email réservée aux demandes d'accès approuvées. ALLOW_EMAIL_SIGNUP=1 la rouvre à tous (tests).
  if (process.env.ALLOW_EMAIL_SIGNUP !== "1" && !(await isApprovedEmail(email.data))) {
    return fail("Cette adresse n'a pas de demande d'accès approuvée. Fais une demande, ou utilise l'adresse de ta demande.", fields);
  }

  if (!(await allow(`signup:ip:${await clientIp()}`, 10, 3600)) || !(await allow(`signup:email:${email.data}`, 5, 3600))) {
    return fail(AUTH_ERRORS.limite, fields);
  }
  if (await isPwned(password)) return fail(AUTH_ERRORS["mdp-fuite"], fields);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: email.data,
    password,
    options: { emailRedirectTo: await confirmUrl(safeNext(str(f, "next"), "")), data: { first_name: first.data, last_name: last.data } },
  });
  // Adresse déjà inscrite : Supabase répond comme pour une nouvelle (pas de fuite), on fait de même.
  if (error && error.code !== "user_already_exists" && error.code !== "email_exists") {
    console.error("signUp", error.code, error.message);
    return fail(AUTH_ERRORS[mapSupabaseError(error.code)], fields);
  }
  return { status: "sent", email: email.data, at: Date.now() };
}

/** « Renvoyer l'email » de vérification (60 s entre deux envois côté bouton, 5 par heure et par adresse ici). */
export async function resendVerification(_prev: AuthState, f: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(f.get("email"));
  if (!email.success) return fail(AUTH_ERRORS["email-invalide"]);
  if (!hasSupabase) return fail(AUTH_ERRORS.indisponible);
  if (!(await allow(`verify:email:${email.data}`, 5, 3600)) || !(await allow(`verify:ip:${await clientIp()}`, 20, 3600))) return fail(AUTH_ERRORS.limite);
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: email.data, options: { emailRedirectTo: await confirmUrl(safeNext(str(f, "next"), "")) } });
  if (error && error.code !== "over_email_send_rate_limit") console.error("resend", error.code, error.message);
  return { status: "sent", email: email.data, at: Date.now() };
}

/** Connexion : 5 essais par 15 min et par adresse, 30 par IP. */
export async function signIn(_prev: AuthState, f: FormData): Promise<AuthState> {
  const fields = { email: str(f, "email") };
  // Un identifiant (sans « @ ») est celui d'un compte créé par l'équipe : il se connecte avec son adresse technique.
  const typed = fields.email.trim().toLowerCase();
  const email = emailSchema.safeParse(!typed.includes("@") && LOGIN_RE.test(typed) ? loginToEmail(typed) : typed);
  const password = str(f, "password");
  if (!email.success || !password) return fail(AUTH_ERRORS.identifiants, fields);
  if (!hasSupabase) return fail(AUTH_ERRORS.indisponible, fields);
  if (!(await allow(`login:email:${email.data}`, 5, 900)) || !(await allow(`login:ip:${await clientIp()}`, 30, 900))) {
    return fail(AUTH_ERRORS["limite-connexion"], fields);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error || !data.user) {
    const code = error?.code === "email_not_confirmed" ? "email-non-verifie" : error?.code === "invalid_credentials" ? "identifiants" : mapSupabaseError(error?.code);
    if (code !== "identifiants" && code !== "email-non-verifie") console.error("signIn", error?.code, error?.message);
    return fail(AUTH_ERRORS[code], fields, code);
  }
  await checkNewDevice(data.user);
  redirect(await afterLogin(data.user, str(f, "next") || null));
}

/** « Mot de passe oublié » : même réponse que l'adresse existe ou non. Lien valable 1 h (voir recovery.ts). */
export async function requestPasswordReset(_prev: AuthState, f: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(f.get("email"));
  if (!email.success) return fail(AUTH_ERRORS["email-invalide"], { email: str(f, "email") });
  if (!hasSupabase) return fail(AUTH_ERRORS.indisponible);
  if (!(await allow(`reset:email:${email.data}`, 3, 3600)) || !(await allow(`reset:ip:${await clientIp()}`, 10, 3600))) return fail(AUTH_ERRORS.limite);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: await confirmUrl("/reinitialiser") });
  if (error && error.code !== "over_email_send_rate_limit") console.error("resetPasswordForEmail", error.code, error.message);
  return { status: "sent", email: email.data, at: Date.now() };
}

/** Nouveau mot de passe, depuis le lien reçu par email (cookie de réinitialisation obligatoire). */
export async function resetPassword(_prev: AuthState, f: FormData): Promise<AuthState> {
  const user = await getUser();
  if (!user || !(await hasRecovery(user))) redirect("/mot-de-passe-oublie?erreur=lien-expire");
  const password = str(f, "password");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);
  if (password !== str(f, "password_confirm")) return fail("Les deux mots de passe ne correspondent pas.");
  if (await isPwned(password)) return fail(AUTH_ERRORS["mdp-fuite"]);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return fail("Choisis un mot de passe différent de l'ancien.");
    console.error("resetPassword", error.code, error.message);
    return fail("Enregistrement impossible. Réessaie.");
  }
  await clearRecovery();
  sendPasswordChanged(user.email);
  redirect(await afterLogin(user, "/dashboard?mdp=ok"));
}

/**
 * Première connexion d'un compte créé par l'équipe (comme Pronote) : choisir son mot de passe, puis donner son adresse e-mail.
 * Tant que ce n'est pas fait, le reste du site renvoie ici (voir requireUser).
 */
export async function completeFirstLogin(_prev: AuthState, f: FormData): Promise<AuthState> {
  const user = await getUser();
  if (!user) redirect("/connexion");
  const managed = await managedOf(user.id);
  if (!managed) redirect("/dashboard");
  const fields = { first_name: str(f, "first_name"), last_name: str(f, "last_name"), email: str(f, "email") };
  const first = nameSchema("Prénom").safeParse(fields.first_name);
  if (!first.success) return fail(first.error.issues[0].message, fields);
  const last = nameSchema("Nom").safeParse(fields.last_name);
  if (!last.success) return fail(last.error.issues[0].message, fields);
  const email = emailSchema.safeParse(fields.email);
  if (!email.success || isManagedEmail(email.data)) return fail("Renseigne ta vraie adresse e-mail.", fields);
  const password = str(f, "password");
  const problem = passwordProblem(password);
  if (problem) return fail(problem, fields);
  if (password !== str(f, "password_confirm")) return fail("Les deux mots de passe ne correspondent pas.", fields);
  if (!(await allow(`first:user:${user.id}`, 10, 900))) return fail(AUTH_ERRORS["limite-connexion"], fields);
  if (await isPwned(password)) return fail(AUTH_ERRORS["mdp-fuite"], fields);

  const admin = createAdminClient();
  // Adresse d'abord (échec « déjà utilisée » possible), puis mot de passe : rien n'est validé tant que les deux ne sont pas passés.
  if (email.data !== user.email) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { email: email.data, email_confirm: true });
    if (error) {
      if (error.code === "email_exists" || /already|registered/i.test(error.message)) return fail("Cette adresse est déjà utilisée par un autre compte.", fields);
      console.error("completeFirstLogin email", error.code, error.message);
      return fail("Enregistrement impossible. Réessaie.", fields);
    }
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return fail("Choisis un mot de passe différent du mot de passe temporaire.", fields);
    console.error("completeFirstLogin password", error.code, error.message);
    return fail("Enregistrement impossible. Réessaie.", fields);
  }
  await admin.from("profiles").update({ first_name: first.data, last_name: last.data }).eq("id", user.id);
  await admin.from("managed_accounts").update({ must_change_password: false, email_required: false }).eq("user_id", user.id);
  await admin.from("admin_audit").insert({ admin_email: "compte géré", action: "managed.first_login", target_user: user.id, before: null, after: { login: managed.login } });
  sendPasswordChanged(email.data);
  redirect(await afterLogin({ ...user, email: email.data }, "/dashboard"));
}

/** Lier un Twitch vérifié à un compte existant (liaison manuelle activée dans Supabase). */
export async function linkTwitch(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""), "/compte");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "twitch",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`${next}?erreur=${mapSupabaseError(error?.code)}`);
  redirect(data.url);
}

// Google : bientôt (bouton désactivé dans AuthCard).
const OAUTH_PROVIDERS = ["twitch", "discord"] as const;

/** Connexion ou inscription avec Twitch ou Discord. Le retour passe par /auth/callback (afterLogin, puis /bienvenue si profil incomplet). */
export async function signInWithProvider(formData: FormData) {
  const provider = OAUTH_PROVIDERS.find((p) => p === formData.get("provider"));
  const next = safeNext(String(formData.get("next") ?? ""), "");
  if (!provider || !hasSupabase) redirect(`/connexion?erreur=${provider ? "indisponible" : "oauth"}`);
  if (!(await allow(`oauth:ip:${await clientIp()}`, 30, 3600))) redirect("/connexion?erreur=limite");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await origin()}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}` },
  });
  if (error || !data.url) redirect(`/connexion?erreur=${mapSupabaseError(error?.code)}`);
  redirect(data.url);
}

export async function signOut() {
  if (hasSupabase) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
