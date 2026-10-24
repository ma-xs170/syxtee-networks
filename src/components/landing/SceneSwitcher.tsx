"use client";

import { useState } from "react";

const SCENES = ["Début du stream", "En direct", "Connexion perdue", "Fin du stream"];

/**
 * Démo du changement de scène, comme le mode Studio d'OBS : un tap met une scène en aperçu (orange), un second tap
 * ou « Passer en direct » l'envoie à l'antenne (rouge). Maquette : aucun OBS derrière.
 */
export default function SceneSwitcher() {
  const [live, setLive] = useState(1);
  const [preview, setPreview] = useState<number | null>(null);

  const pick = (i: number) => {
    if (i === live) return;
    if (i === preview) {
      setLive(i);
      setPreview(null);
    } else setPreview(i);
  };

  return (
    <div className="w-full">
      <div role="group" aria-label="Scènes (démonstration)" className="grid w-full grid-cols-2 gap-3">
        {SCENES.map((s, i) => {
          const isLive = i === live;
          const isPreview = i === preview;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={isLive || isPreview}
              onClick={() => pick(i)}
              className={`relative min-h-12 rounded-xl border px-4 py-4 text-center text-sm transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none motion-reduce:active:scale-100 ${
                isLive
                  ? "border-program bg-program/15 text-foreground"
                  : isPreview
                    ? "border-preview bg-preview/15 text-foreground"
                    : "border-line text-muted hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex min-h-9 items-center justify-end gap-3 text-xs text-muted">
        {preview !== null && (
          <button
            type="button"
            onClick={() => pick(preview)}
            className="rounded-full border border-program px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-program/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Passer en direct
          </button>
        )}
      </div>
    </div>
  );
}
