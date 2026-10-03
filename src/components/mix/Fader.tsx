"use client";

import { useRef } from "react";

// Fader vertical de console : course de −∞ à +6 dB, repère 0 dB, valeur en dB, double-clic ou double-tap = retour à 0 dB.
// Glisser au pointeur (souris ou doigt) sans faire défiler la page (touch-action: none). Clavier : flèches, Début, Fin.
// Le gain appliqué doit être lissé côté audio (rampe d'une dizaine de ms) pour éviter les craquements : ici on ne gère que l'interface.

export const DB_MIN = -60;
export const DB_MAX = 6;
const ZERO_AT = 0.75; // position du repère 0 dB sur la course

/** Position (0 à 1) vers dB : courbe douce sous 0 dB, linéaire de 0 à +6. */
export const posToDb = (p: number) => (p >= ZERO_AT ? ((p - ZERO_AT) / (1 - ZERO_AT)) * DB_MAX : p <= 0 ? DB_MIN : DB_MIN * Math.pow(1 - p / ZERO_AT, 1.6));
export const dbToPos = (db: number) => (db >= 0 ? ZERO_AT + (db / DB_MAX) * (1 - ZERO_AT) : db <= DB_MIN ? 0 : ZERO_AT * (1 - Math.pow(db / DB_MIN, 1 / 1.6)));
export const fmtDb = (db: number) => (db <= DB_MIN ? "−∞" : `${db > 0 ? "+" : ""}${db.toFixed(1)}`);

export default function Fader({ db, onChange, disabled, label, wide = false, className = "" }: { db: number; onChange: (db: number) => void; disabled?: boolean; label: string; wide?: boolean; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const set = (clientY: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    const p = 1 - Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    const v = posToDb(p);
    onChange(Math.abs(v) < 0.6 ? 0 : Math.round(v * 10) / 10);
  };
  const pos = dbToPos(db);

  return (
    <div
      ref={track}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Volume ${label}`}
      aria-orientation="vertical"
      aria-valuemin={DB_MIN}
      aria-valuemax={DB_MAX}
      aria-valuenow={Math.round(db)}
      aria-valuetext={`${fmtDb(db)} dB`}
      aria-disabled={disabled}
      onPointerDown={(e) => {
        if (disabled) return;
        drag.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        set(e.clientY);
      }}
      onPointerMove={(e) => drag.current && !disabled && set(e.clientY)}
      onPointerUp={() => (drag.current = false)}
      onPointerCancel={() => (drag.current = false)}
      onDoubleClick={() => !disabled && onChange(0)}
      onKeyDown={(e) => {
        if (disabled) return;
        const step = e.shiftKey ? 3 : 1;
        if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(Math.min(DB_MAX, Math.round(db + step)));
        else if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(Math.max(DB_MIN, Math.round(db - step)));
        else if (e.key === "Home") onChange(DB_MAX);
        else if (e.key === "End") onChange(DB_MIN);
        else if (e.key === "0") onChange(0);
        else return;
        e.preventDefault();
      }}
      className={`relative h-full touch-none select-none rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 ${wide ? "w-12" : "w-7"} ${disabled ? "opacity-40" : "cursor-ns-resize"} ${className}`}
    >
      {/* Rail et repère 0 dB. */}
      <span aria-hidden="true" className="absolute inset-y-1 left-1/2 w-1 -translate-x-1/2 rounded-full bg-foreground/20" />
      <span aria-hidden="true" className="absolute inset-x-0 h-px bg-foreground/60" style={{ bottom: `${ZERO_AT * 100}%` }} />
      <span aria-hidden="true" className="absolute right-full mr-0.5 -translate-y-1/2 font-mono text-[8px] text-muted" style={{ bottom: `calc(${ZERO_AT * 100}% - 4px)` }}>
        0
      </span>
      {/* Poignée. */}
      <span aria-hidden="true" className={`absolute left-1/2 -translate-x-1/2 translate-y-1/2 rounded-sm border border-line-strong bg-foreground shadow-md ${wide ? "h-6 w-11" : "h-4 w-6"}`} style={{ bottom: `${pos * 100}%` }}>
        <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-background" />
      </span>
    </div>
  );
}
