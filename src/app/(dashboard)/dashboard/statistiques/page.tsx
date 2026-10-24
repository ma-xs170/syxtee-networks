import type { Metadata } from "next";
import ControlCenter from "@/components/analyses/ControlCenter";
import { DashHeader, DashPage, SectionTabs } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import { publicCoreUrl } from "@/lib/core";
import { statsTabs } from "@/lib/dashboard-nav";
import { requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Statistiques", robots: { index: false } };

export default async function StatsPage() {
  await requireOwner("/dashboard/statistiques");
  return (
    <DashPage className="max-w-[1500px]">
      <SectionTabs tabs={statsTabs} current="/dashboard/statistiques" label="Statistiques" />
      <PlanGate feature="stats">
        <DashHeader lead="Tes" hl="statistiques" sub="Aperçu, mesures en direct, courbe de qualité et une case par modem, pour chacun de tes relais." />
        <ControlCenter coreUrl={publicCoreUrl} />
      </PlanGate>
    </DashPage>
  );
}
