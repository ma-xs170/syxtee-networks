"use client";

import { useId, useState } from "react";
import { useTimezone } from "./Timezone";
import type { Overview } from "@/lib/dashboard-data";
import { fmtDateLong, fmtDay, fmtDayLong, fmtDuration, fmtHour, fmtInt } from "@/lib/dashboard-data";

// Graphiques du dashboard en SVG : blanc sur noir, grilles white/10, infobulles mono.

const TIP = "pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-line bg-background px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground shadow-[0_12px_30px_-8px_rgba(0,0,0,0.9)]";

/** Indice du relevé sous le curseur (courbe tracée sur toute la largeur du cadre). */
function useScrub(n: number) {
  const [i, setI] = useState<number | null>(null);
  const handlers = {
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setI(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
    },
    onPointerLeave: () => setI(null),
  };
  return [i, handlers] as const;
}

/** Détail d'un relevé : heure, date, débit, et mention du pic. */
function ScrubTip({ index, n, points, startedAt, durationS }: { index: number; n: number; points: number[]; startedAt?: string; durationS?: number }) {
  const tz = useTimezone();
  const at = startedAt && durationS ? new Date(startedAt).getTime() + (index / (n - 1)) * durationS * 1000 : null;
  const peak = Math.max(...points);
  const x = (index / (n - 1)) * 100;
  return (
    <div role="tooltip" className={TIP} style={{ left: `${x}%`, top: 0, transform: `translate(${x > 70 ? "calc(-100% - 12px)" : "12px"}, 0)` }}>
      {at != null && (
        <p>
          <span className="text-foreground">{fmtHour(at, true, tz)}</span> <span className="text-muted">{fmtDateLong(at, tz)}</span>
        </p>
      )}
      <p className="text-base tabular-nums">
        {fmtInt(points[index])} <span className="text-xs text-muted">kbit/s</span>
      </p>
      <p className="text-muted">{points[index] === peak ? "Pic du direct" : `Pic ${fmtInt(peak)} kbit/s`}</p>
    </div>
  );
}

/** Mini-courbe (débit d'un direct). Avec `startedAt` et `durationS`, le survol donne l'heure et la date du relevé. */
export function Sparkline({ points, className = "h-10 w-full", label, startedAt, durationS }: { points: number[]; className?: string; label?: string; startedAt?: string; durationS?: number }) {
  const [hover, handlers] = useScrub(points.length);
  if (points.length < 2) return <div className={className} aria-hidden="true" />;
  const max = Math.max(1, ...points) * 1.1;
  const d = points.map((p, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * 100).toFixed(2)} ${(30 - (p / max) * 28).toFixed(2)}`).join("");
  return (
    <div className={`relative ${className}`} {...handlers}>
      <svg viewBox="0 0 100 31" preserveAspectRatio="none" className="h-full w-full text-foreground" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        <path d="M0 30.5H100" stroke="currentColor" strokeOpacity={0.1} vectorEffect="non-scaling-stroke" />
        <path d={`${d}L100 31L0 31Z`} fill="currentColor" fillOpacity={0.05} />
        <path d={d} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      {hover !== null && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${(hover / (points.length - 1)) * 100}%` }} />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-accent"
            style={{ left: `${(hover / (points.length - 1)) * 100}%`, top: `${((30 - (points[hover] / max) * 28) / 31) * 100}%` }}
          />
          <ScrubTip index={hover} n={points.length} points={points} startedAt={startedAt} durationS={durationS} />
        </>
      )}
    </div>
  );
}

/** Histogramme : minutes de direct par jour, infobulle au survol et au clavier. */
export function DailyBars({ days }: { days: Overview["daily"] }) {
  const tz = useTimezone();
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
            <span key={t} aria-hidden="true" className="absolute inset-x-0 border-t border-foreground/20" style={{ top: `${100 - (t / max) * 100}%` }} />
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
                  className={`block w-full rounded-t-[2px] transition-colors ${d.minutes ? (hover === i ? "bg-accent" : "bg-foreground/20") : "bg-foreground/20"} group-focus-visible:ring-2 group-focus-visible:ring-foreground/50`}
                  style={{ height: d.minutes ? `${Math.max(2, (d.minutes / max) * 100)}%` : "2px" }}
                />
              </button>
            ))}
          </div>
          {hover !== null && (
            <div
              role="tooltip"
              className={`${TIP} -top-2`}
              style={{ left: `${((hover + 0.5) / n) * 100}%`, transform: `translate(${hover > n * 0.7 ? "-100%" : hover < n * 0.3 ? "0" : "-50%"}, -100%)` }}
            >
              <p className="text-muted">{fmtDayLong(days[hover].day)}</p>
              <p className="text-base tabular-nums">{days[hover].minutes ? fmtDuration(days[hover].minutes * 60) : "Pas de direct"}</p>
              {!!days[hover].count && (
                <>
                  <p className="text-muted">
                    {days[hover].count} direct{days[hover].count! > 1 ? "s" : ""}
                    {!!days[hover].avgKbps && ` · ${fmtInt(days[hover].avgKbps!)} kbit/s en moyenne`}
                  </p>
                  {!!days[hover].peakKbps && (
                    <p className="text-muted">
                      Pic {fmtInt(days[hover].peakKbps!)} kbit/s{days[hover].peakAt ? ` à ${fmtHour(days[hover].peakAt!, false, tz)}` : ""}
                    </p>
                  )}
                </>
              )}
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
export function BitrateChart({ points, durationS, startedAt }: { points: number[]; durationS: number; startedAt?: string }) {
  const [hover, handlers] = useScrub(points.length);
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
        <div className="relative h-56 flex-1" {...handlers}>
          {ticks.map((t) => (
            <span key={t} aria-hidden="true" className="absolute inset-x-0 border-t border-foreground/20" style={{ top: `${100 - (t / max) * 100}%` }} />
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-foreground" aria-hidden="true">
            <path d={`${d}L100 100L0 100Z`} fill="currentColor" fillOpacity={0.05} />
            <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
          {hover !== null && (
            <>
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${(hover / (points.length - 1)) * 100}%` }} />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-accent"
                style={{ left: `${(hover / (points.length - 1)) * 100}%`, top: `${100 - (points[hover] / max) * 100}%` }}
              />
              <ScrubTip index={hover} n={points.length} points={points} startedAt={startedAt} durationS={durationS} />
            </>
          )}
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
