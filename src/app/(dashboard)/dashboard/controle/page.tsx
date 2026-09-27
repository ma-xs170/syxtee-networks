import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/dashboard/ui";

export const metadata: Metadata = { title: "Contrôle caméra", robots: { index: false } };

export default function ControlePage() {
  return (
    <ComingSoonPage
      icon="control"
      lead="Contrôle"
      hl="caméra"
      text="Pilote Moblin à distance depuis ce dashboard : ton équipe règle le direct pendant que tu marches."
      points={["Changer de scène et couper le micro", "Zoom et bascule de caméra", "Débit et bitrate adaptatif"]}
    />
  );
}
