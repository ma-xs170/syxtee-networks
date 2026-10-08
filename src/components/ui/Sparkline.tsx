"use client";

import { motion, useReducedMotion } from "motion/react";

/** Courbe qui se dessine au scroll (pathLength). */
export function Sparkline({ data, color = "var(--ok)", className = "h-16 w-full" }: { data: number[]; color?: string; className?: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(...data, 1);
  const w = 200;
  const h = 48;
  const pts = data.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <motion.path d={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
    </svg>
  );
}

/** Barres qui montent en cascade au scroll. */
export function Bars({ data, className = "h-24" }: { data: number[]; className?: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(...data, 1);
  return (
    <div className={`flex items-end gap-1.5 ${className}`} aria-hidden="true">
      {data.map((v, i) => (
        <motion.span key={i} className="flex-1 origin-bottom rounded-t-md bg-foreground/60" style={{ height: `${(v / max) * 100}%` }} initial={reduce ? false : { scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }} />
      ))}
    </div>
  );
}
