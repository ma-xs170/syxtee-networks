import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RelayDetail from "@/components/cloud/RelayDetail";
import PlanGate from "@/components/plans/PlanGate";
import { publicCoreUrl } from "@/lib/core";
import { requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Flux · Cloud", robots: { index: false } };

export default async function CloudRelayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireOwner(`/dashboard/cloud/${id}`);
  return (
    <PlanGate feature="stats" className="flex min-w-0 flex-1 flex-col">
      <RelayDetail coreUrl={publicCoreUrl} relayId={id} />
    </PlanGate>
  );
}
