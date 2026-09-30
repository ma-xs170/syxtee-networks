import type { ReactNode } from "react";
import { requireAdminIdentity } from "@/lib/admin";
import AdminTabs from "./AdminTabs";

// Espace admin : onglets propres à l'admin. La vraie vérification (rôle + TOTP) est refaite dans chaque page,
// action et route ; ce layout renvoie seulement une 404 au plus tôt à un compte normal.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminIdentity();
  return (
    <>
      <AdminTabs />
      {children}
    </>
  );
}
