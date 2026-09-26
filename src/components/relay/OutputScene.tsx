"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import ObsScreen from "@/components/illustrations/ObsScreen";
import { ramp } from "@/components/story/timeline";
import { bitrate, bitrateCurve, congestion, recovered } from "./streamHealth";

// Scène 3 de /relais : la grille devient un seul flux continu et lisse qui sort à droite vers OBS,
// et un mini-dashboard « santé du flux » (débit reçu, congestion, paquets récupérés, courbe de débit stable).
// SVG dans le repère 600 × 600 + calques HTML positionnés en %.

const LINE = { x0: 262, x1: 330, y: 240 };
const pct = (n: number) => `${((n / 600) * 100).toFixed(2)}%`;

/** SVG : les cases de la grille se resserrent en une ligne épaisse et régulière. */
export function OutputLine({ o }: { o: MotionValue<number> }) {
  const grid = useTransform(o, (v) => 1 - ramp(v, 0, 0.2));
  const line = useTransform(o, (v) => ramp(v, 0.1, 0.35));
  return (
    <g className="svg-hairline" stroke="currentColor" strokeLinecap="round" fill="none">
      <motion.g style={{ opacity: grid }} strokeWidth={1} strokeDasharray="2 3" strokeOpacity={0.5}>
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={262 + i * 26} y={229} width={22} height={22} rx={3} />
        ))}
      </motion.g>
      <motion.path d={`M20 ${LINE.y}H${LINE.x1}`} strokeWidth={5} strokeOpacity={0.25} style={{ pathLength: line }} />
      <motion.path d={`M20 ${LINE.y}H${LINE.x1}`} strokeWidth={5} className="bond-dash" style={{ opacity: line }} />
      <motion.text x={20} y={LINE.y - 18} fill="var(--foreground)" stroke="none" className="font-mono text-[13px] lg:text-[11px]" style={{ opacity: line }}>
        FLUX SRT · CONTINU
      </motion.text>
    </g>
  );
}

function Metric({ label, value, unit }: { label: string; value: MotionValue<string>; unit: string }) {
  return (
    <div className="bg-black px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted sm:text-[10px]">{label}</p>
      <p className="mt-1 font-mono text-sm text-foreground sm:text-lg">
        <motion.span>{value}</motion.span> <span className="text-[10px] text-muted sm:text-xs">{unit}</span>
      </p>
    </div>
  );
}

/** HTML : OBS à droite, dashboard « santé du flux » en bas. */
export function OutputOverlay({ o, time }: { o: MotionValue<number>; time: MotionValue<number> }) {
  const obsO = useTransform(o, (v) => ramp(v, 0.25, 0.45));
  const dashO = useTransform(o, (v) => ramp(v, 0.4, 0.6));
  const rate = useTransform(time, (t) => Math.round(bitrate(t)).toLocaleString("fr-FR"));
  const cong = useTransform(time, (t) => congestion(t).toFixed(1).replace(".", ","));
  const rec = useTransform(time, (t) => recovered(t).toLocaleString("fr-FR"));
  const curve = useTransform(time, (t) =>
    bitrateCurve(t)
      .map((v, i, a) => `${i ? "L" : "M"}${((i / (a.length - 1)) * 100).toFixed(1)} ${(34 - v * 28).toFixed(1)}`)
      .join(""),
  );

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <motion.div className="absolute" style={{ left: pct(330), top: pct(96), width: pct(260), height: pct(290), opacity: obsO }}>
        <ObsScreen />
      </motion.div>
      <motion.div
        className="absolute rounded-2xl border border-line bg-black/85 p-3 sm:p-4"
        style={{ left: pct(20), top: pct(400), width: pct(560), opacity: dashO }}
      >
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground sm:text-xs">Santé du flux</p>
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:text-xs">
            <span className="live-dot" /> stable
          </p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
          <Metric label="Débit reçu" value={rate} unit="kbps" />
          <Metric label="Congestion" value={cong} unit="%" />
          <Metric label="Récupérés" value={rec} unit="paquets" />
        </div>
        <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="mt-3 h-10 w-full text-foreground sm:h-12">
          <path d="M0 6H100M0 34H100" stroke="currentColor" strokeOpacity={0.12} strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />
          <motion.path d={curve} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
        </svg>
      </motion.div>
    </div>
  );
}
