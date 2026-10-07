import type { Metadata } from "next";
import InvitesManager from "@/components/dashboard/InvitesManager";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { listInvites, publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = { title: "Invitations", robots: { index: false } };

// Invitations : une personne sans compte pilote ton OBS avec un lien. Tu choisis ses droits et sa durée, et tu peux la retirer à tout moment.
export default async function InvitationsPage() {
  const user = await requireUser("/dashboard/invitations");
  const invites = await listInvites(user.id).catch(() => null);
  return (
    <DashPage>
      <DashHeader lead="Inviter" hl="quelqu'un" sub="Donne le contrôle de ton OBS à un modérateur, un ami ou un monteur. Il n'a pas besoin de compte : un lien suffit." />
      <InvitesManager coreUrl={publicCoreUrl} initial={invites} />
    </DashPage>
  );
}
