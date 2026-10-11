"use client";

import { useState } from "react";
import RelayBox, { type LedState } from "@/components/landing/RelayBox";

// « De plus près » : une liste de pastilles à gauche, le boîtier à droite dont l'écran et les LED suivent la pastille choisie.
type Leds = Partial<Record<"wifi" | "eth" | "cell" | "usb", LedState>>;
const items: { id: string; label: string; text: string; leds: Leds }[] = [
  { id: "hdmi", label: "Caméra HDMI", text: "Un câble HDMI, n'importe quelle caméra, 1080p60.", leds: { wifi: "off", eth: "off", cell: "off", usb: "off" } },
  { id: "cell", label: "4G et 5G", text: "Ta carte SIM 4G ou 5G, et une clé 4G USB de plus pour chaque connexion en plus.", leds: { wifi: "off", eth: "off", cell: "ok", usb: "ok" } },
  { id: "sat", label: "Satellite", text: "Un terminal satellite en Ethernet : le direct tient là où il n'y a aucun réseau mobile.", leds: { wifi: "off", eth: "ok", cell: "off", usb: "off" } },
  { id: "wifi", label: "Wi-Fi", text: "Le Wi-Fi de l'hôtel, du bateau ou du partage de connexion d'un téléphone.", leds: { wifi: "ok", eth: "off", cell: "off", usb: "off" } },
  { id: "all", label: "Tout à la fois", text: "Toutes les connexions envoient ton direct ensemble. Si l'une lâche, les autres compensent.", leds: { wifi: "ok", eth: "ok", cell: "ok", usb: "ok" } },
];

export default function CloserLook() {
  const [sel, setSel] = useState("all");
  const cur = items.find((i) => i.id === sel) ?? items[items.length - 1];
  return (
    <div className="grid items-center gap-8 rounded-[2rem] border border-line bg-background p-6 sm:p-10 lg:grid-cols-[auto_1fr]">
      <div role="tablist" aria-label="De plus près" className="flex flex-wrap gap-3 lg:flex-col lg:items-start">
        {items.map((i) => {
          const on = i.id === sel;
          return (
            <button
              key={i.id}
              role="tab"
              aria-selected={on}
              onClick={() => setSel(i.id)}
              className={`inline-flex min-h-11 items-center gap-3 rounded-full py-2 pl-2 pr-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${on ? "bg-foreground/15 text-foreground" : "bg-foreground/[0.06] text-foreground/85 hover:bg-foreground/10"}`}
            >
              <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full border border-foreground/50 text-base leading-none">{on ? "−" : "+"}</span>
              {i.label}
            </button>
          );
        })}
      </div>
      <div>
        <RelayBox leds={cur.leds} />
        <p role="status" className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-muted">{cur.text}</p>
      </div>
    </div>
  );
}
