import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RelayDetail from "@/components/cloud/RelayDetail";
import { SessionList } from "@/components/dashboard/sessions";
import { Tile } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import { getProfile } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { listSessions } from "@/lib/dashboard-overview";
import { accountTimezone } from "@/lib/regions";
import { requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Statistiques du flux · Cloud", robots: { index: false } };

export default async function CloudRelayStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireOwner(`/dashboard/cloud/${id}/statistiques`);
  const [profile, sessions] = await Promise.all([getProfile(), listSessions({ limit: 100, relayId: id })]);
  return (
    <PlanGate feature="stats" className="flex min-w-0 flex-1 flex-col">
      <RelayDetail coreUrl={publicCoreUrl} relayId={id} view="stats">
        <section aria-label="Directs" className="border-t border-line p-4">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Directs de ce flux</h2>
          <Tile>
            {sessions.length ? (
              <>
                <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_auto] gap-x-4 border-b border-line px-2 pb-2 text-xs text-muted md:grid">
                  <span>Direct</span>
                  <span>Moyen / crête</span>
                  <span>Débit</span>
                  <span className="text-right">Durée</span>
                </div>
                <SessionList sessions={sessions} spark timezone={accountTimezone(profile)} />
              </>
            ) : (
              <p className="text-sm text-muted">Aucun direct enregistré pour ce flux.</p>
            )}
          </Tile>
        </section>
      </RelayDetail>
    </PlanGate>
  );
}
