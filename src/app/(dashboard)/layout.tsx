import { redirect } from "next/navigation";
import { LiveStatusProvider } from "@/components/dashboard/LiveStatus";
import NamesModal from "@/components/auth/NamesModal";
import Nav from "@/components/Nav";
import { DiscordTicketButton, SupportId } from "@/components/SupportId";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { isAdminEmail } from "@/lib/admin";
import { publicCoreUrl } from "@/lib/core";
import { hasNames } from "@/lib/names";

// Dashboard : même barre que le site (menus du dashboard), statut du direct partagé par toutes les pages.
// Pas le footer du site : un simple pied avec l'ID support et le ticket Discord.
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser("/dashboard");
  const profile = await getProfile();
  if (!profile?.onboarded_at) redirect("/bienvenue");
  return (
    <LiveStatusProvider coreUrl={publicCoreUrl}>
      <Nav variant="dashboard" admin={isAdminEmail(user.email)} />
      {/* Prénom/nom manquants : modale hors live, bandeau pendant un live (en haut, sous la barre). */}
      {!hasNames(profile) && <NamesModal />}
      <main className="flex-1">{children}</main>
      {profile.support_id && (
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 pb-4 pt-5 sm:px-6">
            <SupportId id={profile.support_id} compact />
            <DiscordTicketButton id={profile.support_id} size="sm" />
          </div>
        </footer>
      )}
    </LiveStatusProvider>
  );
}
