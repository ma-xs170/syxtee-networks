import type { Metadata } from "next";
import { headers } from "next/headers";
import { DashPage } from "@/components/dashboard/ui";
import RelayList from "@/components/relais/RelayList";
import SecurityAlerts from "@/components/relais/SecurityAlerts";
import { requireUser } from "@/lib/auth/dal";
import { listAlerts, publicCoreUrl } from "@/lib/core";
import { getPlan } from "@/lib/auth/plan";
import { relayLimit } from "@/lib/plans";
import { coreStatusText, loadRelays } from "@/lib/relays";
import PlanGate from "@/components/plans/PlanGate";

export const metadata: Metadata = { title: "Mes relais", robots: { index: false } };

/** Position approximative du visiteur (géolocalisation IP de Vercel), pour estimer la latence des serveurs à venir. */
async function visitorGeo() {
  const h = await headers();
  const lat = Number(h.get("x-vercel-ip-latitude"));
  const lon = Number(h.get("x-vercel-ip-longitude"));
  return h.get("x-vercel-ip-latitude") && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

export default async function RelaisPage({ searchParams }: PageProps<"/dashboard/relais">) {
  const user = await requireUser("/dashboard/relais");
  const { nouveau } = await searchParams;
  const [{ relays, status }, geo, alerts] = await Promise.all([loadRelays(user.id), visitorGeo(), listAlerts(user.id).catch(() => [])]);
  const plan = await getPlan();
  const active = relays.filter((r) => !r.archived).length;

  return (
    <DashPage>
      <PlanGate feature="relais">
      {status === "ok" ? (
        <>
          <RelayList relays={relays} active={active} max={relayLimit(plan)} coreUrl={publicCoreUrl} geo={geo} autoOpen={nouveau === "1"} />
          <SecurityAlerts alerts={alerts} relays={relays} />
        </>
      ) : (
        <>
          <h1 className="mb-8 h-section">Mes relais</h1>
          <p className="text-sm text-muted">
            {coreStatusText[status]}
          </p>
        </>
      )}
    </PlanGate>
    </DashPage>
  );
}
