import type { Metadata } from "next";
import Link from "next/link";
import Recordings from "@/components/dashboard/Recordings";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { coreStatusText, loadRelays } from "@/lib/relays";

export const metadata: Metadata = { title: "Enregistrements", robots: { index: false } };

export default async function EnregistrementsPage() {
  const user = await requireUser("/dashboard/enregistrements");
  const { relays, status } = await loadRelays(user.id);
  const active = relays.filter((r) => !r.archived);

  return (
    <DashPage>
      <PlanGate feature="relais">
        <DashHeader lead="Tes" hl="enregistrements" sub="Le flux de tes relais est gardé sur notre serveur, jusqu'à 10 Go par compte et 15 jours. Télécharge-le avant qu'il expire." />
        {status !== "ok" ? (
          <p className="text-sm text-muted">{coreStatusText[status]}</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-muted">
            Crée d&apos;abord un relais dans{" "}
            <Link href="/dashboard/relais" className="text-foreground underline underline-offset-4">
              Mes relais
            </Link>
            .
          </p>
        ) : (
          <Recordings coreUrl={publicCoreUrl} relays={active.map((r) => ({ id: r.id, name: r.name, record: r.record }))} />
        )}
      </PlanGate>
    </DashPage>
  );
}
