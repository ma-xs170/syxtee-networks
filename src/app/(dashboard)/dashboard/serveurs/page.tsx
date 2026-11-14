import type { Metadata } from "next";
import { DashPage } from "@/components/dashboard/ui";
import RelayList from "@/components/relais/RelayList";
import SecurityAlerts from "@/components/relais/SecurityAlerts";
import { requireOwner } from "@/lib/workspace";
import { listAlerts, publicCoreUrl } from "@/lib/core";
import { getPlan } from "@/lib/auth/plan";
import { relayLimit } from "@/lib/plans";
import { coreStatusText, loadRelays } from "@/lib/relays";
import PlanGate from "@/components/plans/PlanGate";

export const metadata: Metadata = { title: "Connexions", robots: { index: false } };

export default async function RelaisPage({ searchParams }: PageProps<"/dashboard/serveurs">) {
  const user = await requireOwner("/dashboard/serveurs");
  const { nouveau } = await searchParams;
  const [{ relays, status }, alerts, plan] = await Promise.all([loadRelays(user.id), listAlerts(user.id).catch(() => []), getPlan()]);
  const active = relays.filter((r) => !r.archived).length;

  return (
    <DashPage>
      <PlanGate feature="relais">
      {status === "ok" ? (
        <>
          <RelayList relays={relays} active={active} max={relayLimit(plan)} coreUrl={publicCoreUrl} geo={null} autoOpen={nouveau === "1"} />
          <SecurityAlerts alerts={alerts} relays={relays} />
        </>
      ) : (
        <>
          <h1 className="h-page mb-8">Mes <em>connexions</em></h1>
          <p className="text-sm text-muted">
            {coreStatusText[status]}
          </p>
        </>
      )}
    </PlanGate>
    </DashPage>
  );
}
