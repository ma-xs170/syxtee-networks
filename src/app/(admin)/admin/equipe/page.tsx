import type { Metadata } from "next";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import { requireStaff } from "@/lib/admin";
import { serverNow } from "@/lib/regions";
import { listTeam, pendingInvites } from "@/lib/staff-data";
import TeamUI, { type InviteRow, type MemberView } from "./TeamUI";

export const metadata: Metadata = { title: "Admin · Équipe", robots: { index: false } };

// Équipe : tous les membres (propriétaire, administrateurs, développeurs, debuggers, cybersécurité, support), leur présence,
// leur région, leur rôle coloré. Le propriétaire invite par e-mail, change les rôles et les permissions, renvoie un mot de passe.
// Les autres membres voient la liste (lecture seule). Propriétaire : OWNER_EMAIL (Vercel), sinon la 1re adresse de ADMIN_EMAILS.

export default async function AdminTeamPage() {
  const { access } = await requireStaff("any");
  const [team, invites] = await Promise.all([listTeam(), access.owner ? pendingInvites() : Promise.resolve([])]);
  const regions = new Intl.DisplayNames(["fr"], { type: "region" });
  const members: MemberView[] = team.map((m) => ({
    userId: m.userId,
    email: m.email,
    displayName: m.displayName,
    avatarUrl: m.avatarUrl,
    country: m.country,
    regionName: m.country ? (regions.of(m.country) ?? m.country) : null,
    lastSeen: m.lastSeen,
    role: m.role,
    permissions: m.permissions,
    active: m.active,
    source: m.source,
  }));
  const now = serverNow();
  const rows: InviteRow[] = invites.map((i) => ({ id: i.id, email: i.email, role: i.role, daysLeft: Math.max(0, Math.ceil((Date.parse(i.expiresAt) - now) / 86400_000)) }));
  return (
    <DashPage>
      <DashHeader lead="Équipe" hl="SYXTEE" sub={access.owner ? "Tu invites, tu choisis les rôles et ce que chacun a le droit de faire." : "Les membres de l'équipe et leur présence."} />
      <TeamUI members={members} invites={rows} canManage={access.owner} />
    </DashPage>
  );
}
