import type { Metadata } from "next";
import { EncoderSection, FaqSection, FinalCta, ObsBento, ObsHeroSection, PricingSection } from "@/components/landing/Sections";

export const metadata: Metadata = {
  title: { absolute: "OBS CLOUD : pilote ton OBS à distance · SYXTEE NETWORKS" },
  description:
    "Pilote ton OBS à distance depuis ton téléphone ou ton navigateur, diffuse vers YouTube, Twitch et Kick, et garde un flux stable en 4G, 5G et satellite.",
  alternates: { canonical: "/" },
};

// Accueil statique : le contrôle à distance d'OBS Studio avec multistream et relais (hero), puis contrôle, multistream, relais, espaces partagés, tarifs. Aucun paiement : « Demander l'accès ».
export default function Home() {
  return (
    <>
      <ObsHeroSection />
      <ObsBento />
      <EncoderSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </>
  );
}
