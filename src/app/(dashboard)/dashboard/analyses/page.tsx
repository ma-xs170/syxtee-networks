import type { Metadata } from "next";
import ControlCenter from "@/components/analyses/ControlCenter";
import { DashHeader, DashPage, SectionTabs } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import { publicCoreUrl } from "@/lib/core";
import { statsTabs } from "@/lib/dashboard-nav";
import { requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Centre de contrôle", robots: { index: false } };

export default async function ControlCenterPage() {
  await requireOwner("/dashboard/analyses");
  return (
    <DashPage className="max-w-[1500px]">
      <SectionTabs tabs={statsTabs} current="/dashboard/analyses" label="Statistiques" />
      <PlanGate feature="stats">
        <DashHeader lead="Centre de" hl="contrôle" sub="Tous tes relais en direct, une case par modem : débit, gigue, coupures et rendement." />
        <ControlCenter coreUrl={publicCoreUrl} />
      </PlanGate>
    </DashPage>
  );
}
