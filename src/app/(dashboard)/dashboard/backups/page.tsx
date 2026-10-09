import type { Metadata } from "next";
import BackupsList from "@/components/dashboard/BackupsList";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = { title: "Scènes", robots: { index: false } };

// Backups de scènes : tes collections OBS sauvegardées (scènes, sources, filtres et médias), versions, quota.
export default async function BackupsPage() {
  await requireUser("/dashboard/backups");
  return (
    <DashPage>
      <DashHeader lead="Scènes" hl="sauvegardées" sub="Tes collections de scènes OBS, avec leurs médias. Les scripts Lua et Python ne sont pas sauvegardés." />
      <PlanGate feature="relais">
        <BackupsList coreUrl={publicCoreUrl} />
      </PlanGate>
    </DashPage>
  );
}
