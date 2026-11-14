import type { Metadata } from "next";
import ControlCenter from "@/components/analyses/ControlCenter";
import PlanGate from "@/components/plans/PlanGate";
import { publicCoreUrl } from "@/lib/core";
import { requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Statistiques", robots: { index: false } };

export default async function StatsPage() {
  await requireOwner("/dashboard/statistiques");
  return (
    <PlanGate feature="stats">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Statistiques</h1>
        <p className="text-sm text-muted">Débit, latence, pertes et une case par modem, en direct et sur 24 heures.</p>
      </div>
      <ControlCenter coreUrl={publicCoreUrl} />
    </PlanGate>
  );
}
