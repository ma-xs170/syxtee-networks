import type { ReactNode } from "react";
import { getPlan } from "@/lib/auth/plan";
import { can, FEATURES, type Feature } from "@/lib/plans";
import Locked from "./Locked";

/** Page ou bloc réservé aux abonnés : visible mais grisé en formule Gratuit (les actions sont refusées côté serveur). */
export default async function PlanGate({ feature, children, className }: { feature: Feature; children: ReactNode; className?: string }) {
  const locked = !can(await getPlan(), feature);
  return (
    <Locked locked={locked} feature={FEATURES[feature]} className={className}>
      {children}
    </Locked>
  );
}
