import type { Metadata } from "next";
import { CompatStrip, FeatureGrid, GoFurtherSection, IntegrationSection, LandingFinalCta, LandingHero, PricingSection, ProductsSection } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: { absolute: "Contrôle à distance d'OBS Studio, multistream et relais · SYXTEE NETWORKS" },
  description:
    "Pilote OBS Studio depuis ton téléphone, multistream vers Twitch, YouTube, Kick, TikTok, Facebook et X, et relais pour un flux stable en 4G, 5G, Wi-Fi et Starlink.",
  alternates: { canonical: "/" },
};

// Accueil statique : le contrôle à distance d'OBS Studio avec multistream et relais (hero), puis contrôle, multistream, relais, espaces partagés, tarifs. Aucun paiement : « Demander l'accès ».
export default function Home() {
  return (
    <>
      <LandingHero />
      <CompatStrip />
      <IntegrationSection />
      <ProductsSection />
      <GoFurtherSection />
      <FeatureGrid />
      <PricingSection />
      <LandingFinalCta />
    </>
  );
}
