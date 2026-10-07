import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RemoteObs from "@/components/remote/RemoteObs";
import { publicCoreUrl } from "@/lib/core";

// Lien d'invitation : une personne SANS compte pilote l'OBS de celui qui l'a invitée, avec les droits de son invitation.
// Le secret est dans l'adresse : page jamais indexée, et aucun en-tête « referrer » n'est envoyé vers d'autres sites.
export const metadata: Metadata = { title: "Contrôle à distance", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^sli_[0-9a-f]{48}$/.test(token)) notFound();
  return <RemoteObs coreUrl={publicCoreUrl} deviceId="" invite={token} />;
}
