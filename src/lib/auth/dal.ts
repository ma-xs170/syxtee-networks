import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasSupabase } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  twitch_id: string | null;
  twitch_login: string | null;
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
  support_id?: string | null;
};

/** Utilisateur connecté, vérifié auprès de Supabase (une fois par requête). */
export const getUser = cache(async () => {
  // Toujours rendu à la requête (même sans Supabase configuré au build) : jamais de page privée figée.
  await connection();
  if (!hasSupabase) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile | null) ?? null;
});

/** Page privée : redirige vers /connexion sans session. */
export async function requireUser(next: string) {
  const user = await getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return user;
}

/** Redirection interne sûre (jamais vers un autre site). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
