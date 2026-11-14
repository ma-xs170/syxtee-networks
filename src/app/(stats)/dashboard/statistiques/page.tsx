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
      <div className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Centre de contrôle</p>
        <h1 className="mt-2 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight tracking-tight">Tes statistiques</h1>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted">Débit, latence, pertes et une case par modem, en direct et sur 24 heures, pour chacun de tes relais.</p>
      </div>
      <ControlCenter coreUrl={publicCoreUrl} />
    </PlanGate>
  );
}
