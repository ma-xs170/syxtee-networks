import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetCard } from "@/components/auth/AuthCard";
import { getUser } from "@/lib/auth/dal";
import { hasRecovery } from "@/lib/auth/recovery";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

// Ouverte seulement depuis un lien « mot de passe oublié » de moins d'une heure (cookie posé par /auth/confirm).
export default async function ReinitialiserPage() {
  const user = await getUser();
  if (!user || !(await hasRecovery(user))) redirect("/mot-de-passe-oublie?erreur=lien-expire");
  return <ResetCard email={user.email ?? ""} />;
}
