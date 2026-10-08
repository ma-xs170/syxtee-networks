"use client";

import { animate, useInView, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/** Compteur animé : se lance quand il entre à l'écran (tween fluide), chiffres tabulaires. `value` peut ensuite changer : le compteur glisse vers la nouvelle valeur. */
export default function Counter({ value, decimals = 0, suffix = "", className = "" }: { value: number; decimals?: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const fmt = (v: number) => v.toFixed(decimals).replace(".", ",") + suffix;
  useEffect(() => {
    const unsub = mv.on("change", (v) => ref.current && (ref.current.textContent = fmt(v)));
    return unsub; // eslint-disable-next-line
  }, [mv, decimals, suffix]);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      if (ref.current) ref.current.textContent = fmt(value);
      return;
    }
    const c = animate(mv, value, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop(); // eslint-disable-next-line
  }, [inView, value, reduce]);
  return <span ref={ref} className={`font-mono tabular-nums ${className}`}>{fmt(reduce ? value : 0)}</span>;
}
