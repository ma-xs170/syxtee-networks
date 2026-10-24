import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { managedOf } from "@/lib/managed";
import { hasSupabase } from "@/lib/supabase/env";
import { bearerToken, createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  show_first_name?: boolean;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  /** Fuseau IANA (0028_timezone.sql) ; vide = Europe/Paris. */
  timezone?: string | null;
  twitch_id: string | null;
  twitch_login: string | null;
  /** Pseudo Twitch saisi à la main (0033_twitch_handle.sql), sans vérification. */
  twitch?: string | null;
  twitch_display_name: string | null;
  kick: string | null;
  youtube: string | null;
  tiktok: string | null;
  instagram: string | null;
  x: string | null;
  show_on_site: boolean;
  coverage_consent?: boolean;
  /** Opérateur mobile déclaré (Scanner réseau, 0014_scanner.sql). */
  mobile_operator?: "orange" | "sfr" | "digicel" | "free" | "other" | null;
  onboarded_at: string | null;
  plan?: string | null;
  plan_until?: string | null;
  suspended_at?: string | null;
  /** Abonnement Stripe (0019_billing.sql). */
  stripe_customer_id?: string | null;
  billing_interval?: "month" | "year" | null;
  billing_status?: string | null;
  cancel_at_period_end?: boolean;
  billing_period_end?: string | null;
};

/** Utilisateur connecté, vérifié auprès de Supabase (une fois par requête). */
export const getUser = cache(async () => {
  // Toujours rendu à la requête (même sans Supabase configuré au build) : jamais de page privée figée.
  await connection();
  if (!hasSupabase) return null;
  const supabase = await createClient();
  // App native : le jeton est vérifié auprès de Supabase (jamais décodé à la main).
  const token = await bearerToken();
  const { data } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  return data.user;
});

// Colonnes lues à chaque page privée : seulement celles du type Profile (jamais les colonnes internes de la table).
const PROFILE_COLUMNS =
  "id, username, first_name, last_name, show_first_name, avatar_url, bio, country, timezone, twitch_id, twitch_login, twitch, twitch_display_name, kick, youtube, tiktok, instagram, x, show_on_site, coverage_consent, mobile_operator, onboarded_at, plan, plan_until, suspended_at, stripe_customer_id, billing_interval, billing_status, cancel_at_period_end, billing_period_end";

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).single();
  return (data as Profile | null) ?? null;
});

/** Page privée : redirige vers /connexion sans session. */
export async function requireUser(next: string) {
  const user = await getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  // Compte créé par l'équipe : expiré, ou première connexion pas finie.
  const managed = await managedOf(user.id);
  if (managed) {
    if (managed.expires_at && Date.parse(managed.expires_at) <= Date.now()) redirect("/connexion?erreur=compte-expire");
    if (managed.must_change_password || managed.email_required) redirect("/premiere-connexion");
  }
  return user;
}

/** Redirection interne sûre (jamais vers un autre site). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
