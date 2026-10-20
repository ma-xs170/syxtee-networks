import type { Metadata } from "next";
import Overview from "@/components/dashboard/Overview";
import Link from "next/link";
import { getPlan } from "@/lib/auth/plan";
import { getProfile } from "@/lib/auth/dal";
import { canManage, requireOwner } from "@/lib/workspace";
import { listUpcoming } from "@/lib/calendar-data";
import { publicCoreUrl } from "@/lib/core";
import { getOverview } from "@/lib/dashboard-overview";

export const metadata: Metadata = { title: "Tableau de bord", robots: { index: false } };

// Vue d'ensemble : statut du direct, ce qui demande ton attention, activité, dernier direct, abonnement, Mes OBS, accès rapides.
export default async function DashboardPage() {
  // Utilisateur, profil et formule en parallèle (une seule requête chacun, partagée), puis l'aperçu.
  const [user, profileRow, plan] = await Promise.all([requireOwner("/dashboard"), getProfile(), getPlan()]);
  // Un échec du calendrier (migration pas encore appliquée) ne doit jamais casser le tableau de bord.
  const [initial, upcoming] = await Promise.all([getOverview(user.id, profileRow!, "7d", plan), listUpcoming(user.id, 3).catch(() => [])]);
  return (
    <>
      {plan.id === "free" && (
        <div className="mx-auto mb-0 mt-6 w-full max-w-[1200px] px-4 sm:px-6"><div className="dk-card">
          <p className="font-medium">Compte gratuit</p>
          <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-muted">Les services ne sont pas encore ouverts à tous. Tu peux lire la documentation et écrire au support pour demander un accès.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/tarifs" className="btn btn-primary">Voir les forfaits</Link>
            <Link href="/dashboard/aide" className="btn btn-secondary">Demander un accès</Link>
            <Link href="/docs" className="btn btn-secondary">Documentation</Link>
          </div>
        </div></div>
      )}
      <Overview initial={initial} coreUrl={publicCoreUrl} upcoming={upcoming} canEditCalendar={canManage(user.workspace)} />
    </>
  );
}
