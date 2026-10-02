"use client";

import type { MotionValue } from "motion/react";
import { ramp, useV } from "./kit";

// Mini-carte du trajet, fixe dans le bloc sticky : verticale à gauche sur grand écran, en bande en haut sinon.
// Étape en cours : blanc + point rouge. Passées : cochées. Suivantes : muted. Un paquet lumineux suit la progression.
// À la fin de la dernière scène, toutes les étapes s'illuminent une par une.

export const TRIP = ["Téléphone", "Antennes", "Internet", "Câble sous-marin", "Data center", "Serveur", "Chez toi", "OBS", "Live"];

function Marker({ state }: { state: "past" | "now" | "next" }) {
  if (state === "past")
    return (
      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 shrink-0 text-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path d="M1.5 5.2l2.2 2.2L8.5 2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (state === "now")
    return (
      <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full border border-foreground bg-background">
        <span className="h-1 w-1 rounded-full bg-live" />
      </span>
    );
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-foreground/35 bg-background" />;
}

export default function TripMap({ p }: { p: MotionValue<number> }) {
  const v = useV(p);
  const n = TRIP.length;
  const active = Math.min(n - 1, Math.floor(v * n));
  // Final : toutes les étapes s'illuminent, étape par étape
  const lit = Math.floor(ramp(v, (n - 1 + 0.7) / n, (n - 1 + 0.92) / n) * n + 0.0001);
  const state = (i: number): "past" | "now" | "next" => (i < lit || i < active ? "past" : i === active ? "now" : "next");
  const pct = `${(Math.min(1, v) * 100).toFixed(2)}%`;
  return (
    <nav aria-label="Trajet du live" className="pointer-events-none">
      {/* Verticale, dans la marge gauche (grands écrans) */}
      <div className="absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 min-[1400px]:block">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Le trajet</p>
        <div className="relative">
          <div className="absolute bottom-1 left-[4.5px] top-1 w-px bg-foreground/20" />
          <div className="absolute left-[2px] h-1.5 w-1.5 rounded-[1px] bg-accent shadow-[0_0_10px_3px_rgba(255,255,255,0.45)]" style={{ top: `calc(${pct} - 3px)` }} />
          <ol className="relative space-y-4">
            {TRIP.map((s, i) => {
              const st = state(i);
              return (
                <li key={s} className="flex items-center gap-3">
                  <Marker state={st} />
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-300 ${
                      st === "next" ? "text-muted" : "text-foreground"
                    }`}
                  >
                    {s}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* En bande, en haut (mobile et écrans moyens) */}
      <div className="absolute inset-x-4 top-1.5 z-10 flex items-center gap-3 sm:inset-x-6 min-[1400px]:hidden">
        <div className="relative flex flex-1 items-center justify-between">
          <div className="absolute inset-x-1 top-1/2 h-px bg-foreground/20" />
          <div className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-[1px] bg-accent shadow-[0_0_8px_2px_rgba(255,255,255,0.45)]" style={{ left: `calc(${pct} - 3px)` }} />
          {TRIP.map((s, i) => (
            <span key={s} className="relative">
              <Marker state={state(i)} />
            </span>
          ))}
        </div>
        <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground">
          {String(active + 1).padStart(2, "0")} · {TRIP[active]}
        </p>
      </div>
    </nav>
  );
}
