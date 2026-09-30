import type { Metadata } from "next";
import Link from "next/link";
import LiveTrip from "@/components/dashboard/LiveTrip";
import StreamHealth from "@/components/dashboard/StreamHealth";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import RelayPicker from "@/components/relais/RelayPicker";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { defaultRelay } from "@/lib/relay-groups";
import { coreStatusText, loadRelays } from "@/lib/relays";
import PlanGate from "@/components/plans/PlanGate";

export const metadata: Metadata = { title: "Santé du flux", robots: { index: false } };

export default async function SantePage({ searchParams }: PageProps<"/dashboard/sante">) {
  const user = await requireUser("/dashboard/sante");
  const { relay: wanted } = await searchParams;
  const { relays, status } = await loadRelays(user.id);
  const active = relays.filter((r) => !r.archived);
  const current = active.find((r) => r.id === wanted) ?? defaultRelay(active);

  return (
    <DashPage>
      <PlanGate feature="sante">
      <DashHeader lead="Santé du" hl="flux" sub="Débit reçu, RTT, congestion et pertes, mesurés au relais chaque seconde." />
      {status !== "ok" ? (
        <p className="text-sm text-muted">{coreStatusText[status]}</p>
      ) : !current ? (
        <p className="text-sm text-muted">
          Crée d&apos;abord un relais dans{" "}
          <Link href="/dashboard/relais" className="text-foreground underline underline-offset-4">
            Mes relais
          </Link>
          .
        </p>
      ) : (
        <>
          <RelayPicker relays={active} current={current.id} base="/dashboard/sante" />
          <div className="space-y-4">
            <StreamHealth key={current.id} coreUrl={publicCoreUrl} relayId={current.id} />
            <LiveTrip relayId={current.id} />
          </div>
        </>
      )}
    </PlanGate>
    </DashPage>
  );
}
