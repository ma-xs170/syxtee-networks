import type { Metadata } from "next";
import Link from "next/link";
import StreamPreview from "@/components/dashboard/StreamPreview";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import RelayPicker from "@/components/relais/RelayPicker";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { defaultRelay } from "@/lib/relay-groups";
import { coreStatusText, loadRelays } from "@/lib/relays";
import PlanGate from "@/components/plans/PlanGate";

export const metadata: Metadata = { title: "Aperçu", robots: { index: false } };

export default async function ApercuPage({ searchParams }: PageProps<"/dashboard/apercu">) {
  const user = await requireUser("/dashboard/apercu");
  const { relay: wanted } = await searchParams;
  const { relays, status } = await loadRelays(user.id);
  const active = relays.filter((r) => !r.archived);
  const current = active.find((r) => r.id === wanted) ?? defaultRelay(active);

  return (
    <DashPage>
      <PlanGate feature="apercu">
      <DashHeader lead="Ton flux en" hl="direct" sub="Une image toutes les 3 s, visible par toi seul." />
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
          <RelayPicker relays={active} current={current.id} base="/dashboard/apercu" />
          <div className="max-w-4xl">
            <StreamPreview key={current.id} coreUrl={publicCoreUrl} relayId={current.id} />
          </div>
        </>
      )}
    </PlanGate>
    </DashPage>
  );
}
