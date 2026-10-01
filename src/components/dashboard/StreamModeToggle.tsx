"use client";

import { setStreamMode, useStreamMode } from "./streamMode";

// Interrupteur « Mode stream » : floute clés, URLs et e-mail (utile pour montrer le dashboard en live).
export default function StreamModeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const on = useStreamMode();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setStreamMode(!on)}
      title={on ? "Mode stream actif : infos sensibles floutées" : "Mode stream : flouter les infos sensibles"}
      className={`inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-full border text-xs ${withLabel ? "px-3" : "w-8"} transition-colors ${
        on ? "border-accent bg-accent text-on-accent hover:bg-accent-hover" : "border-line text-muted hover:bg-accent/10 hover:text-foreground"
      }`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z" />
        <circle cx="8" cy="8" r="2" />
        {on && <path d="M2.5 13.5l11-11" />}
      </svg>
      <span className={withLabel ? "" : "sr-only"}>Mode stream</span>
    </button>
  );
}
