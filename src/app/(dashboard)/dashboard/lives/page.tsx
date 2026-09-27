import type { Metadata } from "next";
import { SessionList } from "@/components/dashboard/sessions";
import { ArrowLink, DashHeader, DashPage, Tile } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { listSessions } from "@/lib/dashboard-overview";

export const metadata: Metadata = { title: "Historique des lives", robots: { index: false } };

export default async function LivesPage() {
  await requireUser("/dashboard/lives");
  const sessions = await listSessions({ limit: 100 });
  return (
    <DashPage>
      <DashHeader lead="Historique des" hl="lives" sub="Tes 100 derniers directs. Ouvre un direct pour voir sa courbe de débit." />
      <Tile>
        {sessions.length ? (
          <>
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_auto] gap-x-4 border-b border-line px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted md:grid">
              <span>Direct</span>
              <span>Moyen / crête</span>
              <span>Débit</span>
              <span className="text-right">Durée</span>
            </div>
            <SessionList sessions={sessions} spark />
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Aucun direct enregistré pour l&apos;instant.</p>
            <div className="mt-4">
              <ArrowLink href="/dashboard/urls">Mes URLs</ArrowLink>
            </div>
          </>
        )}
      </Tile>
    </DashPage>
  );
}
