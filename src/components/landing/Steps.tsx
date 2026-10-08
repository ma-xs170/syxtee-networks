"use client";

import { useState, type ReactNode } from "react";

// « Comment se passe une live ? » : trois étapes à gauche, grande illustration à droite qui change (fondu + léger flou) selon l'étape active ou survolée.
export default function Steps({ steps, art }: { steps: { title: string; text: string }[]; art: ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
      <ol className="grid gap-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              aria-current={i === active ? "step" : undefined}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={`flex w-full gap-4 rounded-2xl border p-5 text-left transition-[background-color,border-color] duration-200 ${i === active ? "border-line-strong bg-surface" : "border-transparent hover:border-line"}`}
            >
              <span className={`font-mono text-sm ${i === active ? "text-foreground" : "text-muted"}`}>0{i + 1}</span>
              <span>
                <span className={`block text-lg font-semibold tracking-tight transition-colors ${i === active ? "text-foreground" : "text-muted"}`}>{s.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{s.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="bento-cell relative aspect-[4/3] w-full">
        {art.map((a, i) => (
          <div key={i} aria-hidden={i !== active} className={`absolute inset-0 flex items-center justify-center p-8 transition-[opacity,filter,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${i === active ? "opacity-100 blur-0" : "pointer-events-none translate-y-1 opacity-0 blur-md"}`}>
            {a}
          </div>
        ))}
      </div>
    </div>
  );
}
