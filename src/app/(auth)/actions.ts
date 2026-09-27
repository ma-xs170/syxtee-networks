"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth/dal";
import { AUTH_ERRORS, mapSupabaseError } from "@/lib/auth/errors";
import { allow, clientIp } from "@/lib/auth/rateLimit";
import { hasSupabase } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

async function origin() {
  const h = await headers();
  const o = h.get("origin");
  if (o) return o;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}

export type MagicLinkState = { status: "idle" } | { status: "sent"; email: string; at: number } | { status: "error"; message: string; email?: string };

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

/** Lien magique : 5 envois par heure et par adresse, 20 par heure et par IP. */
export async function sendMagicLink(_prev: MagicLinkState, formData: FormData): Promise<MagicLinkState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { status: "error", message: AUTH_ERRORS["email-invalide"] };
  const email = parsed.data;
  if (!hasSupabase) return { status: "error", message: AUTH_ERRORS.indisponible, email };

  if (!(await allow(`magic:email:${email}`, 5, 3600)) || !(await allow(`magic:ip:${await clientIp()}`, 20, 3600))) {
    return { status: "error", message: AUTH_ERRORS.limite, email };
  }

  const next = safeNext(String(formData.get("next") ?? ""), "");
  const redirectTo = `${await origin()}/auth/confirm?next=${encodeURIComponent(next)}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: redirectTo } });
  if (error) {
    console.error("signInWithOtp", error.code, error.message);
    return { status: "error", message: AUTH_ERRORS[mapSupabaseError(error.code)], email };
  }
  return { status: "sent", email, at: Date.now() };
}

const providers = ["twitch", "discord", "google"] as const;
type Provider = (typeof providers)[number];

/** Connexion OAuth : redirige vers le fournisseur, retour sur /auth/callback. */
export async function signInWithProvider(formData: FormData) {
  const provider = String(formData.get("provider")) as Provider;
  if (!providers.includes(provider)) redirect("/connexion?erreur=oauth");
  if (!hasSupabase) redirect("/connexion?erreur=indisponible");
  const next = safeNext(String(formData.get("next") ?? ""), "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/connexion?erreur=${mapSupabaseError(error?.code)}`);
  redirect(data.url);
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

export async function signOut() {
  if (hasSupabase) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
