"use client";

import { useState } from "react";

const SCENES = ["Début du stream", "En direct", "Connexion perdue", "Fin du stream"];

/** Démo du changement de scène : un tap choisit la scène active (sans OBS derrière, c'est une maquette). */
export default function SceneSwitcher() {
  const [active, setActive] = useState(1);
  return (
    <div role="radiogroup" aria-label="Scène active (démonstration)" className="grid w-full grid-cols-2 gap-3">
      {SCENES.map((s, i) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={i === active}
          onClick={() => setActive(i)}
          className={`min-h-12 rounded-xl border px-4 py-4 text-center text-sm transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none motion-reduce:active:scale-100 ${
            i === active ? "border-foreground/40 bg-surface-2 text-foreground" : "border-line text-muted hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
