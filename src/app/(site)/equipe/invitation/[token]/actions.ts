"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/dal";
import { acceptInvite } from "@/lib/staff-data";

// Accepter une invitation d'équipe avec le compte connecté (l'adresse doit être celle de l'invitation). Puis double authentification.
export async function acceptInvitationAction(token: string) {
  const user = await getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(`/equipe/invitation/${token}`)}`);
  const r = await acceptInvite(token, user);
  if (r === "ok") redirect("/admin/2fa");
  redirect(`/equipe/invitation/${token}?erreur=${r}`);
}
