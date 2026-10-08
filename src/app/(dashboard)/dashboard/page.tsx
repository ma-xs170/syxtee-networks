import type { Metadata } from "next";
import Overview from "@/components/dashboard/Overview";
import { DashPage } from "@/components/dashboard/ui";
import Link from "next/link";
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
      {plan.id === "free" && (
        <div className="mb-4 rounded-2xl border border-line-strong bg-surface p-5 sm:p-6">
          <p className="font-medium">Compte gratuit</p>
          <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-muted">Les services ne sont pas encore ouverts à tous. Tu peux lire la documentation et écrire au support pour demander un accès.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/tarifs" className="btn btn-primary">Voir les forfaits</Link>
            <Link href="/dashboard/support" className="btn btn-secondary">Demander un accès</Link>
            <Link href="/docs" className="btn btn-secondary">Documentation</Link>
          </div>
        </div>
      )}
      <InstallCard className="mb-4" />
      <Overview initial={initial} coreUrl={publicCoreUrl} />
    </DashPage>
  );
}
