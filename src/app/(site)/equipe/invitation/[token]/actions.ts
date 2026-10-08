"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/dal";
import { hasSupabase } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/lib/staff-data";

// Accepter une invitation d'équipe avec le compte connecté (l'adresse doit être celle de l'invitation). Puis double authentification.
export async function acceptInvitationAction(token: string) {
  const user = await getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(`/equipe/invitation/${token}`)}`);
  const r = await acceptInvite(token, user);
  if (r === "ok") redirect("/admin/2fa");
  redirect(`/equipe/invitation/${token}?erreur=${r}`);
}

/** Connecté avec un autre compte que celui de l'invitation : on déconnecte, puis on renvoie vers la connexion avec l'adresse invitée. */
export async function switchAccountAction(token: string, email: string) {
  if (hasSupabase) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(`/connexion?email=${encodeURIComponent(email)}&next=${encodeURIComponent(`/equipe/invitation/${token}`)}`);
}
