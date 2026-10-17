import type { Metadata } from "next";
import DestinationsApp from "@/components/dashboard/DestinationsApp";
import PlanGate from "@/components/plans/PlanGate";
import { Column, PageTitle } from "@/components/dashboard/kit";
import { requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";
import { publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = { title: "Destinations", robots: { index: false } };

// Destinations : où part le direct (Twitch, Kick, YouTube, Instagram, TikTok, X). Les sorties vivent dans le plugin, sur le PC d'OBS.
export default async function DestinationsPage() {
  const [, plan] = await Promise.all([requireUser("/dashboard/destinations"), getPlan()]);
  return (
    <Column>
      <PageTitle title="Destinations" sub="Choisis les plateformes qui reçoivent ton direct." />
      <PlanGate feature="remote">
        <DestinationsApp coreUrl={publicCoreUrl} rights={{ prises: plan.regiePrises, cams: plan.regieCams }} />
      </PlanGate>
    </Column>
  );
}
