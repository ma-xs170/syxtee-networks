import type { Metadata } from "next";
import EmptyState from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { Users } from "@/components/icons";
import { getPersonalPlan } from "@/lib/auth/plan";
import { requireUser } from "@/lib/auth/dal";
import { getActiveWorkspace, loadMembers } from "@/lib/workspace";
import TeamSettings from "./TeamSettings";

export const metadata: Metadata = { title: "Paramètres : équipe", robots: { index: false } };

// Équipe = l'espace partagé actif. En espace personnel, on invite à en créer un depuis le sélecteur du haut de la barre latérale.
export default async function EquipePage() {
  const [user, ws, personal] = await Promise.all([requireUser("/dashboard/parametres/equipe"), getActiveWorkspace(), getPersonalPlan()]);
  if (!ws) {
    const canCreate = personal.maxWorkspaces > 0;
    return (
      <div className="card">
        <EmptyState
          icon={<Users weight="light" />}
          title="Aucune équipe pour l'instant"
          text={canCreate ? "Crée un espace partagé depuis le sélecteur en haut de la barre latérale, puis invite tes modérateurs et ton équipe." : "Passe en Payant pour débloquer les espaces partagés."}
          action={canCreate ? undefined : <ButtonLink href="/dashboard/abonnement">Voir l&apos;abonnement</ButtonLink>}
        />
      </div>
    );
  }
  const { members, invites } = await loadMembers(ws.id);
  const admin = ws.role === "owner" || ws.role === "admin";
  return (
    <TeamSettings
      workspace={{ id: ws.id, name: ws.name, color: ws.color, role: ws.role }}
      admin={admin}
      owner={ws.role === "owner"}
      meId={user.id}
      members={members.map((m) => ({ id: m.user_id, name: m.name, email: m.email, role: m.role, joined: m.created_at }))}
      invites={invites.map((i) => ({ id: i.id, email: i.email, role: i.role, created: i.created_at }))}
    />
  );
}
