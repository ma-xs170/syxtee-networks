import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/dashboard/ui";

export const metadata: Metadata = { title: "SYXTEE Cam", robots: { index: false } };

export default function CamPage() {
  return (
    <ComingSoonPage
      icon="cam"
      lead="SYXTEE"
      hl="Cam"
      text="Un deuxième téléphone devient une caméra de ton direct, reliée au même relais."
      points={["Plan large ou caméra face à toi", "Même clé, aucune URL de plus", "Bascule depuis OBS ou Moblin"]}
    />
  );
}
