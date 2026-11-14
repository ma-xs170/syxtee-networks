import type { Metadata } from "next";
import CloudHome from "@/components/cloud/CloudHome";
import PlanGate from "@/components/plans/PlanGate";
import { publicCoreUrl } from "@/lib/core";
import { requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Cloud", robots: { index: false } };

export default async function CloudPage() {
  await requireOwner("/dashboard/cloud");
  return (
    <PlanGate feature="stats" className="flex min-w-0 flex-1 flex-col">
      <CloudHome coreUrl={publicCoreUrl} />
    </PlanGate>
  );
}
