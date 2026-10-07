import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Heartbeat from "@/components/dashboard/Heartbeat";
import { currentStaff } from "@/lib/admin";
import { pendingCount } from "@/lib/access";
import { supportBadges } from "@/lib/support";
import AdminShell from "./AdminShell";

// Espace admin : coque à part (barre latérale propre), séparée du dashboard client. La vraie vérification (rôle, permission, TOTP)
// est refaite dans chaque page, action et route ; ce layout renvoie seulement une 404 au plus tôt à un compte qui n'est pas dans l'équipe.
// Le battement de présence (Heartbeat) tourne ici aussi : c'est lui qui affiche « En ligne » dans la liste de l'équipe.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await currentStaff();
  if (!me?.access) notFound();
  const { user, access } = me;
  const full = access.role === "owner" || access.role === "admin";
  const [support, pending] = await Promise.all([access.permissions.has("support") ? supportBadges() : Promise.resolve({ all: 0, byCategory: { relais: 0, compte: 0, facturation: 0, bug: 0, suggestion: 0, autre: 0 } }), access.permissions.has("access") ? pendingCount() : Promise.resolve(0)]);
  return (
    <AdminShell support={support} pendingAccess={pending} name={user.email ?? "Admin"} role={access.role} permissions={[...access.permissions]} full={full}>
      <Heartbeat />
      {children}
    </AdminShell>
  );
}
