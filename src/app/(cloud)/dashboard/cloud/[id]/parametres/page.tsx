import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlanGate from "@/components/plans/PlanGate";
import ProtocolBadge from "@/components/relais/ProtocolBadge";
import RelayUrls from "@/components/relais/RelayUrls";
import { getRelay } from "@/lib/core";
import { requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Paramètres du flux · Cloud", robots: { index: false } };

export default async function CloudRelaySettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireOwner(`/dashboard/cloud/${id}/parametres`);
  const relay = await getRelay(user.id, id).catch(() => null);
  return (
    <PlanGate feature="stats" className="flex min-w-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-4xl p-4">
        {!relay ? (
          <p className="py-10 text-center text-sm text-muted">Ce flux est introuvable, ou le service ne répond pas pour le moment.</p>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-3">
              <h1 className="truncate text-lg font-medium">{relay.name}</h1>
              <ProtocolBadge protocol={relay.protocol} />
            </div>
            {relay.archived ? (
              <p className="text-sm text-muted">Ce flux est archivé : ses adresses ne marchent plus. Réactive-le depuis le tableau de bord.</p>
            ) : (
              <RelayUrls relay={relay} />
            )}
            <Link href={`/dashboard/cloud/${id}`} className="mt-6 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground">
              <span aria-hidden="true">←</span> Retour au flux
            </Link>
          </>
        )}
      </div>
    </PlanGate>
  );
}
