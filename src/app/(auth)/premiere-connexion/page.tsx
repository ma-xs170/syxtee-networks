import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FirstLoginCard } from "@/components/auth/AuthCard";
import { getProfile, getUser } from "@/lib/auth/dal";
import { managedOf } from "@/lib/managed";

export const metadata: Metadata = { title: "Première connexion", robots: { index: false } };

// Compte créé par l'équipe : nouveau mot de passe obligatoire, puis adresse e-mail. Tant que ce n'est pas fait, le site renvoie ici.
export default async function PremiereConnexionPage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/premiere-connexion");
  const managed = await managedOf(user.id);
  if (!managed) redirect("/dashboard");
  if (!managed.must_change_password && !managed.email_required) redirect("/dashboard");
  const profile = await getProfile();
  return <FirstLoginCard login={managed.login} first={profile?.first_name ?? ""} last={profile?.last_name ?? ""} />;
}
