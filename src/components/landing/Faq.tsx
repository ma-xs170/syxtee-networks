"use client";

import { useState } from "react";

/** FAQ en accordéon : la hauteur s'anime (grid 0fr vers 1fr), le chevron tourne. Un seul volet ouvert à la fois. */
export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl divide-y divide-line rounded-2xl border border-line">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={it.q}>
            <h3>
              <button type="button" aria-expanded={on} aria-controls={`faq-${i}`} onClick={() => setOpen(on ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-base font-medium transition-colors hover:bg-surface">
                {it.q}
                <svg viewBox="0 0 12 12" className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-300 ${on ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M3 4.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </h3>
            <div id={`faq-${i}`} role="region" className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-sm leading-relaxed text-muted">{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
