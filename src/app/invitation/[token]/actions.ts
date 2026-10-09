"use server";

import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Connecté avec une autre adresse que celle de l'invitation : on déconnecte, puis on renvoie vers la connexion avec l'adresse invitée. */
export async function switchInviteAccountAction(next: string, email: string) {
  if (hasSupabase) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(`/connexion?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}
