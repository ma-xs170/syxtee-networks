import type { Metadata } from "next";
import LiveTrip from "@/components/dashboard/LiveTrip";
import StreamHealth from "@/components/dashboard/StreamHealth";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { hasCore, publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = { title: "Santé du flux", robots: { index: false } };

export default async function SantePage() {
  await requireUser("/dashboard/sante");
  return (
    <DashPage>
      <DashHeader lead="Santé du" hl="flux" sub="Débit reçu, RTT, congestion et pertes, mesurés au relais chaque seconde." />
      {hasCore ? (
        <div className="space-y-4">
          <StreamHealth coreUrl={publicCoreUrl} />
          <LiveTrip />
        </div>
      ) : (
        <p className="text-sm text-muted">Le relais n&apos;est pas encore branché au dashboard.</p>
      )}
    </DashPage>
  );
}
