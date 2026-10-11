"use client";

import dynamic from "next/dynamic";
import type { LedState, ViewName } from "@/components/syxtee-encoder";

// three.js n'est chargé que dans le navigateur, après le premier affichage de la page.
const SyxteeEncoder = dynamic(() => import("@/components/syxtee-encoder").then((m) => m.SyxteeEncoder), { ssr: false });

/** Le vrai Encodeur en 3D. Pas d'interaction (ni glisser ni molette) : la page défile normalement par-dessus. Le conteneur donne la hauteur. */
export default function EncoderViewer({ view = "q", led = "pret", zoom, focusX, className = "h-[320px] sm:h-[420px]" }: { view?: ViewName; led?: LedState; zoom?: number; focusX?: number; className?: string }) {
  return (
    <div className={`w-full [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)] ${className}`}>
      <SyxteeEncoder finish="noir" led={led} theme="dark" view={view} zoom={zoom} focusX={focusX} interactive={false} />
    </div>
  );
}
