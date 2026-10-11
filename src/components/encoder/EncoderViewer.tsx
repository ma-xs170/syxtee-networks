"use client";

import dynamic from "next/dynamic";
import type { LedState, ViewName } from "@/components/syxtee-encoder";

// three.js n'est chargé que dans le navigateur, après le premier affichage de la page.
const SyxteeEncoder = dynamic(() => import("@/components/syxtee-encoder").then((m) => m.SyxteeEncoder), { ssr: false });

/** Le vrai Encodeur en 3D. Pas d'interaction (ni glisser ni molette) : la page défile normalement par-dessus. Le conteneur donne la hauteur. */
export default function EncoderViewer({ view = "q", led = "pret", className = "h-[320px] sm:h-[420px]" }: { view?: ViewName; led?: LedState; className?: string }) {
  return (
    <div className={`w-full ${className}`}>
      <SyxteeEncoder finish="noir" led={led} theme="dark" view={view} interactive={false} />
    </div>
  );
}
