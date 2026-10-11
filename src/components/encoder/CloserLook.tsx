"use client";

import { useState } from "react";
import EncoderViewer from "@/components/encoder/EncoderViewer";
import type { LedState, ViewName } from "@/components/syxtee-encoder";

// « De plus près » : une pastille par partie du boîtier ; la caméra du vrai Encodeur 3D tourne vers cette partie.
const parts: { id: string; label: string; text: string; view: ViewName; led?: LedState }[] = [
  { id: "all", label: "Vue d'ensemble", text: "Un boîtier compact en aluminium, SYXTEE NETWORKS gravé sur le dessus.", view: "q" },
  { id: "hdmi", label: "Entrée HDMI", text: "Ta caméra se branche ici, en HDMI, 1080p60.", view: "rear" },
  { id: "eth", label: "Ethernet", text: "Pour un terminal satellite : le direct tient là où il n'y a aucun réseau mobile.", view: "rear" },
  { id: "usb", label: "Port USB-C", text: "Une clé 4G de plus ajoute une connexion supplémentaire.", view: "rear" },
  { id: "pwr", label: "Alimentation", text: "Un câble USB-C, ou une batterie externe en déplacement.", view: "rear" },
  { id: "led", label: "Voyant", text: "Orange en veille, vert quand il est prêt, rouge qui pulse en direct.", view: "front", led: "pret" },
  { id: "top", label: "Dessus gravé", text: "Le logo SYXTEE poli, sur le dessus du boîtier.", view: "top" },
];

export default function CloserLook() {
  const [sel, setSel] = useState("all");
  const cur = parts.find((p) => p.id === sel) ?? parts[0];
  return (
    <div className="grid items-center gap-8 rounded-[2rem] border border-line bg-background p-6 sm:p-10 lg:grid-cols-[auto_1fr]">
      <div role="tablist" aria-label="Parties du boîtier" className="flex flex-wrap gap-3 lg:flex-col lg:items-start">
        {parts.map((p) => {
          const on = p.id === sel;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={on}
              onClick={() => setSel(p.id)}
              className={`inline-flex min-h-11 items-center gap-3 rounded-full py-2 pl-2 pr-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${on ? "bg-foreground/15 text-foreground" : "bg-foreground/[0.06] text-foreground/85 hover:bg-foreground/10"}`}
            >
              <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full border border-foreground/50 text-base leading-none">{on ? "−" : "+"}</span>
              {p.label}
            </button>
          );
        })}
      </div>
      <div>
        <EncoderViewer view={cur.view} led={cur.led ?? "pret"} className="h-[300px] sm:h-[400px]" />
        <p role="status" className="mx-auto mt-2 max-w-md text-center text-sm leading-relaxed text-muted">{cur.text}</p>
      </div>
    </div>
  );
}
