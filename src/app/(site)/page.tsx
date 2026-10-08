import type { Metadata } from "next";
import Hero from "@/components/sections/Hero";
import NumberedFeatures from "@/components/sections/NumberedFeatures";
import FinalCta from "@/components/sections/FinalCta";

export const metadata: Metadata = {
  title: { absolute: "Un direct, toutes tes plateformes · SYXTEE NETWORKS" },
  description:
    "Multistream : lance ou arrête chaque diffusion (Twitch, YouTube, Kick, TikTok, Facebook, X) d'un toucher depuis ton téléphone. Pilote OBS à distance.",
  alternates: { canonical: "/" },
};

// Accueil statique : le multistream en vedette (hero), puis quatre arguments (relais, contrôle à distance, espaces partagés, tarifs). Aucun paiement : « Demander l'accès ».
export default function Home() {
  return (
    <>
      <Hero />
      <NumberedFeatures />
      <FinalCta />
    </>
  );
}
