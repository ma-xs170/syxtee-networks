import type { Metadata } from "next";
import StreamerWall from "@/components/home/StreamerWall";
import { getHomeStreamers } from "@/lib/streamers";
import { WhySection } from "@/components/landing/WhySection";
import { FinalCta, ObsBento, ObsHeroSection, PricingSection } from "@/components/landing/Sections";

export const metadata: Metadata = {
  title: { absolute: "SYXTEE NETWORKS · Le direct en mobilité, sans compromis" },
  description:
    "Pilote ton OBS à distance, diffuse partout en un clic et garde un flux stable, où que tu sois. Pensé pour les créateurs exigeants.",
  alternates: { canonical: "/" },
};

// Accueil statique : le contrôle à distance d'OBS Studio avec multistream et relais (hero), puis contrôle, multistream, relais, espaces partagés, tarifs. Aucun paiement : « Demander l'accès ».
// Le mur de chaînes se rafraîchit toutes les 5 minutes (nouvelles chaînes ajoutées dans l'admin, statut en direct).
export const revalidate = 300;

export default async function Home() {
  const streamers = await getHomeStreamers();
  return (
    <>
      <ObsHeroSection streamers={streamers} />
      <ObsBento />
      <WhySection />
      <PricingSection />
      <StreamerWall streamers={streamers} />
      <FinalCta />
    </>
  );
}
