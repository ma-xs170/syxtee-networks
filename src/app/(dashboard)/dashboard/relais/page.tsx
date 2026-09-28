import type { Metadata } from "next";
import { headers } from "next/headers";
import { DashPage } from "@/components/dashboard/ui";
import RelayList from "@/components/relais/RelayList";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { planOf, relayLimit } from "@/lib/plans";
import { coreStatusText, loadRelays } from "@/lib/relays";

export const metadata: Metadata = { title: "Mes relais", robots: { index: false } };

/** Position approximative du visiteur (géolocalisation IP de Vercel), pour estimer la latence des serveurs à venir. */
async function visitorGeo() {
  const h = await headers();
  const lat = Number(h.get("x-vercel-ip-latitude"));
  const lon = Number(h.get("x-vercel-ip-longitude"));
  return h.get("x-vercel-ip-latitude") && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

export default async function RelaisPage() {
  const user = await requireUser("/dashboard/relais");
  const [{ relays, status }, geo] = await Promise.all([loadRelays(user.id), visitorGeo()]);
  const plan = planOf(user.id);
  const active = relays.filter((r) => !r.archived).length;

  return (
    <DashPage>
      {status === "ok" ? (
        <RelayList relays={relays} active={active} max={relayLimit(plan)} coreUrl={publicCoreUrl} geo={geo} />
      ) : (
        <>
          <h1 className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl">Mes relais</h1>
          <p className="text-sm text-muted">
            {coreStatusText[status]}
          </p>
        </>
      )}
    </DashPage>
  );
}
