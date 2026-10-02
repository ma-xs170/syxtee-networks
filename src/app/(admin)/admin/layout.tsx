import type { ReactNode } from "react";
import { requireAdminIdentity } from "@/lib/admin";
import { ticketCounts } from "@/lib/support";
import AdminShell from "./AdminShell";

// Espace admin : coque à part (barre latérale propre), séparée du dashboard client. La vraie vérification (rôle + TOTP)
// est refaite dans chaque page, action et route ; ce layout renvoie seulement une 404 au plus tôt à un compte normal.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminIdentity();
  const { open } = await ticketCounts();
  return (
    <AdminShell openTickets={open} name={user.email ?? "Admin"}>
      {children}
    </AdminShell>
  );
}
