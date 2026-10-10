import type { Metadata } from "next";
import InstallCard from "@/components/pwa/InstallApp";
import RemoteList from "@/components/dashboard/RemoteList";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = { title: "Contrôle à distance", robots: { index: false } };

// Contrôle à distance : tes OBS reliés au compte. « Piloter OBS » ouvre l'interface d'OBS sur le site.
export default async function RemotePage() {
  await requireUser("/dashboard/controle-a-distance");
  return (
    <DashPage>
      <DashHeader lead="Contrôle" hl="à distance" sub="Tu pilotes OBS depuis un onglet. Change de scène depuis ton téléphone, comme devant ton écran." />
      <PlanGate feature="remote">
        <InstallCard className="mb-6" />
        <RemoteList coreUrl={publicCoreUrl} />
      </PlanGate>
    </DashPage>
  );
}
