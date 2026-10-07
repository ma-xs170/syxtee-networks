import type { Metadata } from "next";
import InvitesManager from "@/components/dashboard/InvitesManager";
import { DashPage } from "@/components/dashboard/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";
import { listInvites, publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = { title: "Invitations", robots: { index: false } };

// Membres : les personnes qui pilotent ton OBS avec un lien (sans compte). Nombre limité par la formule : Basique aucun, Premium 3, Extra 5, partenaire 3, admin illimité.
export default async function InvitationsPage() {
  const user = await requireUser("/dashboard/invitations");
  const [invites, plan, profile] = await Promise.all([listInvites(user.id).catch(() => null), getPlan(), getProfile()]);
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.twitch_display_name || user.email?.split("@")[0] || "Moi";
  return (
    <DashPage>
      <InvitesManager
        coreUrl={publicCoreUrl}
        initial={invites}
        planName={plan.name}
        max={Number.isFinite(plan.maxInvites) ? plan.maxInvites : null}
        owner={{ name, email: user.email ?? "", avatar: profile?.avatar_url ?? null, since: user.created_at ?? null }}
      />
    </DashPage>
  );
}
