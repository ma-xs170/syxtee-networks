import type { Metadata } from "next";
import InvitesManager from "@/components/dashboard/InvitesManager";
import WorkspaceSettings from "@/components/dashboard/WorkspaceSettings";
import { DashPage } from "@/components/dashboard/ui";
import { getProfile } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";
import { listInvites, publicCoreUrl } from "@/lib/core";
import { loadMembers, requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Membres", robots: { index: false } };

// Membres, pour tous les comptes. Espace personnel : les invités sans compte (liens qui donnent le pilotage d'OBS). Espace partagé (fait pour les équipes) :
// en plus, les comptes de l'équipe avec leurs rôles.
export default async function MembersPage() {
  const owner = await requireOwner("/dashboard/invitations");
  const [invites, plan, profile, team] = await Promise.all([listInvites(owner.id).catch(() => null), getPlan(), getProfile(), owner.workspace ? loadMembers(owner.workspace.id) : Promise.resolve(null)]);
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.twitch_display_name || "Moi";
  return (
    <DashPage>
      <InvitesManager
        coreUrl={publicCoreUrl}
        initial={invites}
        planName={plan.name}
        max={Number.isFinite(plan.maxInvites) ? plan.maxInvites : null}
        owner={{ name, email: owner.user.email ?? "", avatar: profile?.avatar_url ?? null, since: owner.user.created_at ?? null }}
        team={owner.workspace && team ? { name: owner.workspace.name, role: owner.workspace.role, meId: owner.user.id, members: team.members, pending: team.invites } : null}
      />
      {owner.workspace && <WorkspaceSettings id={owner.workspace.id} name={owner.workspace.name} role={owner.workspace.role} />}
    </DashPage>
  );
}
