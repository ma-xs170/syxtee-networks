import type { Metadata } from "next";
import Link from "next/link";
import LiveStudio from "@/components/dashboard/LiveStudio";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
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
      <DashHeader lead="Ton flux en" hl="direct" sub="La vidéo en temps réel, visible par toi seul." />
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
          <LiveStudio sources={active.map((r) => ({ id: r.id, name: r.name, live: r.live }))} coreUrl={publicCoreUrl} initial={current.id} />
        </>
      )}
    </PlanGate>
    </DashPage>
  );
}
