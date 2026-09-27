import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/dashboard/ui";

export const metadata: Metadata = { title: "Carte du débit", robots: { index: false } };

export default function CartePage() {
  return (
    <ComingSoonPage
      icon="map"
      lead="Carte du"
      hl="débit"
      text="Ton trajet, coloré par la qualité du signal : repère les rues où la 4G faiblit avant ton prochain direct."
      points={["Position envoyée par Moblin, jamais publique", "Débit et coupures le long du trajet", "Comparaison entre deux directs"]}
    />
  );
}
