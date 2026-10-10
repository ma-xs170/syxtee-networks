import type { Metadata } from "next";
import PluginDownload from "@/components/dashboard/PluginDownload";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import type { PluginLatest } from "@/lib/plugin";

export const metadata: Metadata = { title: "Plugin OBS SYXTEE", robots: { index: false } };

// Plugin OBS SYXTEE : téléchargement (système du visiteur détecté), aide à l'installation, détection du poste une fois installé.
export default async function PluginPage() {
  await requireUser("/dashboard/plugin");
  const latest = publicCoreUrl
    ? ((await fetch(`${publicCoreUrl}/v1/plugin/latest`, { next: { revalidate: 60 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)) as PluginLatest | null)
    : null;
  return (
    <DashPage>
      <DashHeader lead="Plugin OBS" hl="SYXTEE" sub="Pilote OBS depuis un onglet. Tout tourne sur ton ordinateur : ta carte graphique fait déjà le travail." />
      <PlanGate feature="remote">
        <PluginDownload coreUrl={publicCoreUrl} latest={latest} />
      </PlanGate>
    </DashPage>
  );
}
