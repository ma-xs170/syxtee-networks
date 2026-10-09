import type { Metadata } from "next";
import { AndroidSteps, IosSteps } from "@/components/pwa/InstallApp";
import PluginDownload from "@/components/dashboard/PluginDownload";
import RemotePosts from "@/components/dashboard/RemotePosts";
import { Card, TabsNav } from "@/components/dashboard/panel";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import type { PluginLatest } from "@/lib/plugin";

export const metadata: Metadata = { title: "Contrôle à distance", robots: { index: false } };

const TABS = [
  { id: "postes", label: "Mes OBS" },
  { id: "plugin", label: "Plugin OBS" },
  { id: "application", label: "Application mobile" },
] as const;

// Contrôle à distance : un onglet par sujet. Mes OBS (postes reliés, Piloter OBS), Plugin OBS (téléchargement), Application mobile.
export default async function RemotePage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams;
  await requireUser("/dashboard/controle-a-distance");
  const tab = TABS.find((t) => t.id === onglet)?.id ?? "postes";
  const latest =
    tab === "plugin" && publicCoreUrl
      ? ((await fetch(`${publicCoreUrl}/v1/plugin/latest`, { next: { revalidate: 60 } })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)) as PluginLatest | null)
      : null;
  return (
    <DashPage>
      <DashHeader lead="Contrôle" hl="à distance" sub="Tu pilotes OBS depuis un onglet. Change de scène depuis ton téléphone, comme devant ton écran." />
      <PlanGate feature="relais">
        <TabsNav tabs={TABS.map((t) => ({ id: t.id, label: t.label, href: t.id === "postes" ? "/dashboard/controle-a-distance" : `/dashboard/controle-a-distance?onglet=${t.id}` }))} current={tab} label="Sections du contrôle à distance" />
        {tab === "postes" && <RemotePosts coreUrl={publicCoreUrl} />}
        {tab === "plugin" && <PluginDownload coreUrl={publicCoreUrl} latest={latest} />}
        {tab === "application" && (
          <div className="grid max-w-4xl items-stretch gap-6 md:grid-cols-2">
            <Card title="iPhone et iPad" className="h-full">
              <div className="py-5">
                <IosSteps />
              </div>
            </Card>
            <Card title="Android" className="h-full">
              <div className="py-5">
                <AndroidSteps />
              </div>
            </Card>
          </div>
        )}
      </PlanGate>
    </DashPage>
  );
}
