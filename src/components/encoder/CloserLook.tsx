"use client";

import { useState } from "react";
import EncoderViewer from "@/components/encoder/EncoderViewer";
import type { LedState, ViewName } from "@/components/syxtee-encoder";

// « De plus près » : une pastille par partie du boîtier ; la caméra du vrai Encodeur 3D tourne vers cette partie.
const parts: { id: string; label: string; text: string; view: ViewName; led?: LedState; zoom: number; x?: number }[] = [
  { id: "all", label: "Vue d'ensemble", text: "Un boîtier compact en aluminium, SYXTEE NETWORKS gravé sur le dessus.", view: "q", zoom: 0.62 },
  { id: "hdmi", label: "Entrée HDMI", text: "Ta caméra se branche ici, en HDMI, 1080p60.", view: "rear", zoom: 0.42, x: -0.45 },
  { id: "eth", label: "Ethernet", text: "Pour un terminal satellite : le direct tient là où il n'y a aucun réseau mobile.", view: "rear", zoom: 0.42, x: 2.5 },
  { id: "usb", label: "Port USB-C", text: "Une clé 4G de plus ajoute une connexion supplémentaire.", view: "rear", zoom: 0.42, x: -3.0 },
  { id: "pwr", label: "Alimentation", text: "Un câble USB-C, ou une batterie externe en déplacement.", view: "rear", zoom: 0.42, x: 4.7 },
  { id: "led", label: "Voyant", text: "Orange en veille, vert quand il est prêt, rouge qui pulse en direct. Essaie les trois états.", view: "front", led: "pret", zoom: 0.5 },
  { id: "top", label: "Dessus gravé", text: "Le logo SYXTEE poli, sur le dessus du boîtier.", view: "top", zoom: 0.55 },
];

const LEDS: { id: LedState; label: string; c: string }[] = [
  { id: "veille", label: "Veille", c: "var(--warn)" },
  { id: "pret", label: "Prêt", c: "var(--ok)" },
  { id: "direct", label: "En direct", c: "var(--live)" },
];

export default function CloserLook() {
  const [sel, setSel] = useState("all");
  const [led, setLed] = useState<LedState>("pret");
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
        <EncoderViewer view={cur.view} led={cur.id === "led" ? led : "pret"} zoom={cur.zoom} focusX={cur.x} className="h-[340px] sm:h-[460px]" />
        {cur.id === "led" && (
          <div role="group" aria-label="État du voyant" className="mt-3 flex flex-wrap justify-center gap-2">
            {LEDS.map((l) => (
              <button key={l.id} type="button" aria-pressed={led === l.id} onClick={() => setLed(l.id)} className={`inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${led === l.id ? "bg-foreground/15 text-foreground" : "bg-foreground/[0.06] text-foreground/80 hover:bg-foreground/10"}`}>
                <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: l.c }} />
                {l.label}
              </button>
            ))}
          </div>
        )}
        <p role="status" className="mx-auto mt-2 max-w-md text-center text-sm leading-relaxed text-muted">{cur.text}</p>
      </div>
    </div>
  );
}
