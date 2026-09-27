"use client";

import { useId, useState } from "react";
import { fmtDay, fmtDuration, fmtInt } from "@/lib/dashboard-data";

// Graphiques du dashboard en SVG : blanc sur noir, grilles white/10, infobulles mono.

/** Mini-courbe (débit d'un direct). */
export function Sparkline({ points, className = "h-10 w-full", label }: { points: number[]; className?: string; label?: string }) {
  if (points.length < 2) return <div className={className} aria-hidden="true" />;
  const max = Math.max(1, ...points) * 1.1;
  const d = points.map((p, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * 100).toFixed(2)} ${(30 - (p / max) * 28).toFixed(2)}`).join("");
  return (
    <svg viewBox="0 0 100 31" preserveAspectRatio="none" className={`text-foreground ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d="M0 30.5H100" stroke="currentColor" strokeOpacity={0.1} vectorEffect="non-scaling-stroke" />
      <path d={`${d}L100 31L0 31Z`} fill="currentColor" fillOpacity={0.05} />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Histogramme : minutes de direct par jour, infobulle au survol et au clavier. */
export function DailyBars({ days }: { days: { day: string; minutes: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const raw = Math.max(0, ...days.map((d) => d.minutes));
  // Axe en minutes, arrondi à une graduation lisible.
  const step = raw <= 60 ? 15 : raw <= 180 ? 30 : raw <= 360 ? 60 : 120;
  const max = Math.max(step * 2, Math.ceil(raw / step) * step);
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const n = days.length;
  const total = days.reduce((a, d) => a + d.minutes, 0);

  return (
    <figure className="relative" aria-labelledby={`${id}-cap`}>
      <figcaption id={`${id}-cap`} className="sr-only">
        Minutes de direct par jour sur {n} jours, {fmtDuration(total * 60)} au total.
      </figcaption>
      <div className="flex gap-3">
        <div className="relative w-9 shrink-0 font-mono text-[10px] text-muted" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / max) * 100}%` }}>
              {t >= 60 && t % 60 === 0 ? `${t / 60} h` : `${t}`}
            </span>
          ))}
        </div>
        <div className="relative h-44 flex-1">
          {ticks.map((t) => (
            <span key={t} aria-hidden="true" className="absolute inset-x-0 border-t border-white/10" style={{ top: `${100 - (t / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 grid items-end gap-[3px]" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} onMouseLeave={() => setHover(null)}>
            {days.map((d, i) => (
              <button
                key={d.day}
                type="button"
                className="group relative flex h-full items-end focus-visible:outline-none"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${fmtDay(d.day)} : ${d.minutes ? fmtDuration(d.minutes * 60) : "pas de direct"}`}
              >
                <span
                  className={`block w-full rounded-t-[2px] transition-colors ${d.minutes ? (hover === i ? "bg-white" : "bg-white/75") : "bg-white/10"} group-focus-visible:ring-2 group-focus-visible:ring-white/50`}
                  style={{ height: d.minutes ? `${Math.max(2, (d.minutes / max) * 100)}%` : "2px" }}
                />
              </button>
            ))}
          </div>
          {hover !== null && (
            <div
              role="tooltip"
              className="pointer-events-none absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-md border border-line bg-black px-2.5 py-1.5 font-mono text-[11px] text-foreground shadow-[0_12px_30px_-8px_rgba(0,0,0,0.9)]"
              style={{ left: `${((hover + 0.5) / n) * 100}%`, transform: `translate(${hover > n * 0.7 ? "-100%" : hover < n * 0.3 ? "0" : "-50%"}, -100%)` }}
            >
              <span className="text-muted">{fmtDay(days[hover].day)}</span> {days[hover].minutes ? fmtDuration(days[hover].minutes * 60) : "rien"}
            </div>
          )}
        </div>
      </div>
      <div className="ml-12 mt-2 flex justify-between font-mono text-[10px] text-muted" aria-hidden="true">
        <span>{fmtDay(days[0].day)}</span>
        <span>{fmtDay(days[Math.floor(n / 2)].day)}</span>
        <span>Aujourd&apos;hui</span>
      </div>
    </figure>
  );
}

/** Grande courbe du débit d'un direct, axe en kbit/s. */
export function BitrateChart({ points, durationS }: { points: number[]; durationS: number }) {
  if (points.length < 2) return <p className="text-sm text-muted">Pas assez de relevés pour tracer la courbe.</p>;
  const raw = Math.max(...points);
  const step = raw <= 3000 ? 1000 : raw <= 8000 ? 2000 : 4000;
  const max = Math.max(step, Math.ceil(raw / step) * step);
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const d = points.map((p, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * 100).toFixed(2)} ${(100 - (p / max) * 100).toFixed(2)}`).join("");
  return (
    <figure>
      <figcaption className="sr-only">Débit du direct, de {fmtInt(Math.min(...points))} à {fmtInt(raw)} kbit/s.</figcaption>
      <div className="flex gap-3">
        <div className="relative w-12 shrink-0 font-mono text-[10px] text-muted" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / max) * 100}%` }}>
              {fmtInt(t)}
            </span>
          ))}
        </div>
        <div className="relative h-56 flex-1">
          {ticks.map((t) => (
            <span key={t} aria-hidden="true" className="absolute inset-x-0 border-t border-white/10" style={{ top: `${100 - (t / max) * 100}%` }} />
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-foreground" aria-hidden="true">
            <path d={`${d}L100 100L0 100Z`} fill="currentColor" fillOpacity={0.05} />
            <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div className="ml-[3.75rem] mt-2 flex justify-between font-mono text-[10px] text-muted" aria-hidden="true">
        <span>0</span>
        <span>{fmtDuration(durationS / 2)}</span>
        <span>{fmtDuration(durationS)}</span>
      </div>
    </figure>
  );
}
