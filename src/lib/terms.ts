import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Conditions d'utilisation et de vente : à chaque changement de texte, passer TERMS_VERSION à la date du jour.
// Tous les comptes revoient alors la fenêtre « Mise à jour de nos conditions » à leur prochaine visite.
export const TERMS_VERSION = "2026-10-11";

/** Vrai si le compte doit (re)valider les conditions. Une erreur de lecture (migration pas encore appliquée) ne bloque personne. */
export async function needsTerms(userId: string): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().from("profiles").select("terms_version").eq("id", userId).maybeSingle();
    if (error) return false;
    return !!data && data.terms_version !== TERMS_VERSION;
  } catch {
    return false;
  }
}

export async function recordTerms(userId: string) {
  await createAdminClient().from("profiles").update({ terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() }).eq("id", userId);
}
