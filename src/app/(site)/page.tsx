import type { Metadata } from "next";
import Hero from "@/components/sections/Hero";
import HowItWorks3 from "@/components/sections/HowItWorks3";
import NumberedFeatures from "@/components/sections/NumberedFeatures";
import FinalCta from "@/components/sections/FinalCta";
import { getHomeStreamers } from "@/lib/streamers";

export const metadata: Metadata = {
  title: { absolute: "Streame en direct, où que tu sois · SYXTEE NETWORKS" },
  description:
    "Réunis 4G, 5G, Wi-Fi et Starlink en un seul flux stable, et pilote OBS depuis ton téléphone. Des serveurs dans le monde entier.",
  alternates: { canonical: "/" },
};

// Accueil statique, régénéré toutes les 60 s (streamers et statut live Twitch).
// Centré sur le relais. SYXTEE PRO est « À venir » (FEATURE_PRO) : plus de teaser ici.
export default async function Home() {
  const streamers = await getHomeStreamers();
  return (
    <>
      <Hero streamers={streamers} />
      <HowItWorks3 />
      <NumberedFeatures />
      <FinalCta />
    </>
  );
}
