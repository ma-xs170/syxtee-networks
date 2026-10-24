import type { Metadata } from "next";
import StreamerWall from "@/components/home/StreamerWall";
import { getHomeStreamers } from "@/lib/streamers";
import { AnalysisSection } from "@/components/landing/AnalysisSection";
import SupportSection from "@/components/landing/SupportSection";
import { FinalCta, HomeHero, ObsBento, ProductionSection, StreamersIntro } from "@/components/landing/Sections";

export const metadata: Metadata = {
  title: { absolute: "SYXTEE NETWORKS · Le live IRL, partout" },
  description:
    "Production de live IRL (régie, cadreurs, relais SRTLA) depuis la Guadeloupe, sur devis. Et pour les streamers indépendants : contrôle d'OBS à distance et relais SRTLA à petit prix.",
  alternates: { canonical: "/" },
};

// Accueil statique : la promesse, ceux qui nous font confiance, puis deux parcours : les productions (devis) et les streamers indépendants (outils), « Me soutenir » et l'appel final.
// Le mur de chaînes se rafraîchit toutes les 5 minutes (nouvelles chaînes ajoutées dans l'admin, statut en direct).
export const revalidate = 300;

export default async function Home() {
  const streamers = await getHomeStreamers();
  return (
    <>
      <HomeHero />
      <StreamerWall streamers={streamers} />
      <ProductionSection />
      <StreamersIntro streamers={streamers} />
      <ObsBento />
      <AnalysisSection />
      <SupportSection id="soutenir" />
      <FinalCta />
    </>
  );
}
