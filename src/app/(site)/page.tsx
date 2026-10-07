import type { Metadata } from "next";
import Hero from "@/components/sections/Hero";
import HowItWorks3 from "@/components/sections/HowItWorks3";
import NumberedFeatures, { FeatureStrip } from "@/components/sections/NumberedFeatures";
import FinalCta from "@/components/sections/FinalCta";
import { getHomeStreamers } from "@/lib/streamers";

export const metadata: Metadata = {
  title: { absolute: "Streame en direct, où que tu sois · SYXTEE NETWORKS" },
  description:
    "Réunis 4G, 5G, Wi-Fi et Starlink en un seul flux stable, et pilote OBS depuis ton téléphone. Des serveurs dans le monde entier.",
  alternates: { canonical: "/" },
};

// Accueil statique, régénéré toutes les 60 s (streamers et statut live Twitch).
// Quatre arguments (relais, contrôle à distance, espaces partagés, tarifs accessibles), puis l'encodeur sac à dos. Aucun paiement : « Demander l'accès ».
export default async function Home() {
  const streamers = await getHomeStreamers();
  return (
    <>
      <Hero streamers={streamers} />
      <FeatureStrip />
      <HowItWorks3 />
      <NumberedFeatures />
      <FinalCta />
    </>
  );
}
