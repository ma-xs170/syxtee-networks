import type { Metadata } from "next";
import { FaqSection, FieldSection, FinalCta, ObsBento, ObsHeroSection, PricingSection } from "@/components/landing/Sections";

export const metadata: Metadata = {
  title: { absolute: "SYXTEE NETWORKS · Le direct en mobilité, sans compromis" },
  description:
    "Pilote ton OBS à distance, diffuse partout en un clic et garde un flux stable, où que tu sois. Pensé pour les créateurs exigeants.",
  alternates: { canonical: "/" },
};

// Accueil statique : le contrôle à distance d'OBS Studio avec multistream et relais (hero), puis contrôle, multistream, relais, espaces partagés, tarifs. Aucun paiement : « Demander l'accès ».
export default function Home() {
  return (
    <>
      <ObsHeroSection />
      <ObsBento />
      <FieldSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </>
  );
}
