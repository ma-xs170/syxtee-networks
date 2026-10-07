import type { Metadata } from "next";
import Overview from "@/components/dashboard/Overview";
import { DashPage } from "@/components/dashboard/ui";
import InstallCard from "@/components/pwa/InstallApp";
import { getPlan } from "@/lib/auth/plan";
import { getProfile } from "@/lib/auth/dal";
import { requireOwner } from "@/lib/workspace";
import { publicCoreUrl } from "@/lib/core";
import { getOverview } from "@/lib/dashboard-overview";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Vue d'ensemble : statut du direct, ce qui demande ton attention, activité, dernier direct, abonnement, Mes OBS, accès rapides.
export default async function DashboardPage() {
  // Utilisateur, profil et formule en parallèle (une seule requête chacun, partagée), puis l'aperçu.
  const [user, profileRow, plan] = await Promise.all([requireOwner("/dashboard"), getProfile(), getPlan()]);
  const initial = await getOverview(user.id, profileRow!, "7d", plan);
  return (
    <DashPage>
      <InstallCard className="mb-4" />
      <Overview initial={initial} coreUrl={publicCoreUrl} />
    </DashPage>
  );
}
