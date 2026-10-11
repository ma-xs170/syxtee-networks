"use client";

import { useState } from "react";
import EncoderViewer from "@/components/encoder/EncoderViewer";
import type { LedState, ViewName } from "@/components/syxtee-encoder";

// « De plus près » : trois pastilles (les sous-choix suivent l'ordre réel sur le boîtier, de gauche à droite) (Vue d'ensemble, Modes, Connectivité). Modes et Connectivité ont des sous-choix ;
// la caméra du vrai Encodeur 3D tourne vers la partie choisie, le voyant change de couleur selon le mode.
type Item = { id: string; label: string; text: string; view: ViewName; zoom: number; x?: number; led?: LedState; dot?: string };
type Group = { id: string; label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    id: "all",
    label: "Vue d'ensemble",
    items: [{ id: "all", label: "", text: "Un boîtier compact en aluminium, SYXTEE NETWORKS gravé sur le dessus. La caméra se branche à l'arrière, le voyant est à l'avant.", view: "q", zoom: 0.62 }],
  },
  {
    id: "modes",
    label: "Modes",
    items: [
      { id: "veille", label: "Veille", text: "Voyant orange : le boîtier est allumé mais ne diffuse pas.", view: "front", zoom: 0.5, led: "veille", dot: "var(--warn)" },
      { id: "pret", label: "Prêt", text: "Voyant vert : les connexions sont bonnes, tu peux lancer ton direct.", view: "front", zoom: 0.5, led: "pret", dot: "var(--ok)" },
      { id: "direct", label: "En direct", text: "Voyant rouge qui pulse : ton direct est en ligne.", view: "front", zoom: 0.5, led: "direct", dot: "var(--live)" },
    ],
  },
  {
    id: "conn",
    label: "Connectivité",
    items: [
      { id: "pwr", label: "Alimentation", text: "Un câble USB-C, ou une batterie externe en déplacement.", view: "rear", zoom: 0.42, x: 6.8 },
      { id: "eth", label: "Ethernet", text: "Pour un terminal satellite : le direct tient là où il n'y a aucun réseau mobile.", view: "rear", zoom: 0.42, x: 2.5 },
      { id: "hdmi", label: "HDMI", text: "Ta caméra se branche ici, en HDMI, 1080p60.", view: "rear", zoom: 0.42, x: -0.45 },
      { id: "usb", label: "USB-C", text: "Une clé 4G de plus ajoute une connexion supplémentaire.", view: "rear", zoom: 0.42, x: -3.0 },
    ],
  },
];

const pill = (on: boolean) =>
  `inline-flex min-h-11 items-center gap-3 rounded-full py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${on ? "bg-foreground/15 text-foreground" : "bg-foreground/[0.06] text-foreground/85 hover:bg-foreground/10"}`;

export default function CloserLook() {
  const [gid, setGid] = useState("all");
  const [iid, setIid] = useState<Record<string, string>>({ all: "all", modes: "pret", conn: "pwr" });
  const group = GROUPS.find((g) => g.id === gid) ?? GROUPS[0];
  const item = group.items.find((i) => i.id === iid[gid]) ?? group.items[0];
  return (
    <div className="grid items-center gap-8 rounded-[2rem] border border-line bg-background p-6 sm:p-10 lg:grid-cols-[auto_1fr]">
      <div role="tablist" aria-label="Parties du boîtier" className="flex flex-wrap gap-3 lg:flex-col lg:items-start">
        {GROUPS.map((g) => {
          const on = g.id === gid;
          return (
            <button key={g.id} role="tab" aria-selected={on} onClick={() => setGid(g.id)} className={`${pill(on)} pl-2 pr-5`}>
              <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full border border-foreground/50 text-base leading-none">{on ? "−" : "+"}</span>
              {g.label}
            </button>
          );
        })}
      </div>
      <div>
        <EncoderViewer view={item.view} led={item.led ?? "pret"} zoom={item.zoom} focusX={item.x} className="h-[340px] sm:h-[460px]" />
        {group.items.length > 1 && (
          <div role="group" aria-label={group.label} className="mt-3 flex flex-wrap justify-center gap-2">
            {group.items.map((i) => (
              <button key={i.id} type="button" aria-pressed={i.id === item.id} onClick={() => setIid((s) => ({ ...s, [gid]: i.id }))} className={`${pill(i.id === item.id)} min-h-9 px-4`}>
                {i.dot && <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: i.dot }} />}
                {i.label}
              </button>
            ))}
          </div>
        )}
        <p role="status" className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-muted">{item.text}</p>
      </div>
    </div>
  );
}
