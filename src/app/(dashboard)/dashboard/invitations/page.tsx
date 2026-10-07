import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InvitesManager from "@/components/dashboard/InvitesManager";
import { DashPage } from "@/components/dashboard/ui";
import { getProfile } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";
import { listInvites, publicCoreUrl } from "@/lib/core";
import { loadMembers, requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Membres", robots: { index: false } };

// Membres d'un espace partagé : l'équipe (comptes) et les invités sans compte (liens). Pas de membres dans l'espace personnel.
export default async function MembersPage() {
  const owner = await requireOwner("/dashboard/invitations");
  if (!owner.workspace) redirect("/dashboard");
  const [invites, plan, profile, team] = await Promise.all([listInvites(owner.id).catch(() => null), getPlan(), getProfile(), loadMembers(owner.workspace.id)]);
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.twitch_display_name || "Moi";
  return (
    <DashPage>
      <InvitesManager
        coreUrl={publicCoreUrl}
        initial={invites}
        planName={plan.name}
        max={Number.isFinite(plan.maxInvites) ? plan.maxInvites : null}
        owner={{ name, email: owner.user.email ?? "", avatar: profile?.avatar_url ?? null, since: owner.user.created_at ?? null }}
        team={{ name: owner.workspace.name, role: owner.workspace.role, meId: owner.user.id, members: team.members, pending: team.invites }}
      />
    </DashPage>
  );
}
