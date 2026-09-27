import { redirect } from "next/navigation";
import { LiveStatusProvider } from "@/components/dashboard/LiveStatus";
import Nav from "@/components/Nav";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";

// Dashboard : même barre que le site (menus du dashboard), statut du direct partagé par toutes les pages, pas de footer.
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  await requireUser("/dashboard");
  const profile = await getProfile();
  if (!profile?.onboarded_at) redirect("/bienvenue");
  return (
    <LiveStatusProvider coreUrl={publicCoreUrl}>
      <Nav variant="dashboard" />
      <main className="flex-1">{children}</main>
    </LiveStatusProvider>
  );
}
