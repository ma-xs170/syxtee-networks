import type { Metadata } from "next";
import { SessionList } from "@/components/dashboard/sessions";
import { ArrowLink, DashHeader, DashPage, Tile, SectionTabs } from "@/components/dashboard/ui";
import RelayPicker from "@/components/relais/RelayPicker";
import { statsTabs } from "@/lib/dashboard-nav";
import { requireUser } from "@/lib/auth/dal";
import { listSessions } from "@/lib/dashboard-overview";
import { loadRelays } from "@/lib/relays";
import PlanGate from "@/components/plans/PlanGate";

export const metadata: Metadata = { title: "Historique des lives", robots: { index: false } };

export default async function LivesPage({ searchParams }: PageProps<"/dashboard/lives">) {
  const user = await requireUser("/dashboard/lives");
  const { relay: wanted } = await searchParams;
  const { relays } = await loadRelays(user.id);
  const current = relays.find((r) => r.id === wanted)?.id ?? null;
  const sessions = await listSessions({ limit: 100, relayId: current ?? undefined });
  return (
    <DashPage>
      <SectionTabs tabs={statsTabs} current="/dashboard/lives" label="Statistiques" />
      <PlanGate feature="lives">
      <DashHeader lead="Historique des" hl="lives" sub="Tes 100 derniers directs. Ouvre un direct pour voir sa courbe de débit." />
      <RelayPicker relays={relays} current={current} base="/dashboard/lives" all={relays.length > 1} />
      <Tile>
        {sessions.length ? (
          <>
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_auto] gap-x-4 border-b border-line px-2 pb-2 text-xs text-muted md:grid">
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
              <ArrowLink href="/dashboard/relais">Mes relais</ArrowLink>
            </div>
          </>
        )}
      </Tile>
    </PlanGate>
    </DashPage>
  );
}
