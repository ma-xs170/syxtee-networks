"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ViewName } from "@/components/syxtee-encoder";

// three.js n'est chargé que dans le navigateur, après le premier affichage de la page.
const SyxteeEncoder = dynamic(() => import("@/components/syxtee-encoder").then((m) => m.SyxteeEncoder), { ssr: false });

const VIEWS: { id: ViewName; label: string }[] = [
  { id: "q", label: "¾" },
  { id: "front", label: "Face" },
  { id: "rear", label: "Arrière" },
  { id: "top", label: "Dessus" },
  { id: "bottom", label: "Dessous" },
];

/** Encodeur en 3D du hero : glisser pour tourner, molette pour zoomer, boutons pour changer de vue. */
export default function HeroEncoder() {
  const [view, setView] = useState<ViewName>("q");
  return (
    <div className="w-full">
      <div className="h-[340px] w-full sm:h-[440px] lg:h-[min(52dvh,560px)]">
        <SyxteeEncoder finish="noir" led="pret" theme="dark" view={view} />
      </div>
      <div role="group" aria-label="Vue de l'Encodeur" className="mt-2 flex flex-wrap justify-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
            className={`min-h-9 rounded-full px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${view === v.id ? "bg-foreground/15 text-foreground" : "bg-foreground/[0.06] text-foreground/80 hover:bg-foreground/10"}`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
