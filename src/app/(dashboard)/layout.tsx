import { redirect } from "next/navigation";
import { LiveStatusProvider } from "@/components/dashboard/LiveStatus";
import NamesModal from "@/components/auth/NamesModal";
import DashboardShell from "@/components/dashboard/Sidebar";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { isAdminEmail } from "@/lib/admin";
import { publicCoreUrl } from "@/lib/core";
import { hasNames } from "@/lib/names";
import { TimezoneProvider } from "@/components/dashboard/Timezone";
import { accountTimezone } from "@/lib/regions";

// Dashboard : barre latérale (Sidebar.tsx), statut du direct partagé par toutes les pages.
// Pas de footer : l'ID support et le ticket Discord vivent sur la page Support.
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser("/dashboard");
  const profile = await getProfile();
  if (!profile?.onboarded_at) redirect("/bienvenue");
  return (
    <LiveStatusProvider coreUrl={publicCoreUrl}>
      <TimezoneProvider timezone={accountTimezone(profile)}>
      <DashboardShell admin={isAdminEmail(user.email)}>
      {/* Prénom/nom manquants : modale hors live, bandeau pendant un live (en haut, sous la barre). */}
      {!hasNames(profile) && <NamesModal />}
      <main className="flex-1">{children}</main>
      </DashboardShell>
      </TimezoneProvider>
    </LiveStatusProvider>
  );
}
