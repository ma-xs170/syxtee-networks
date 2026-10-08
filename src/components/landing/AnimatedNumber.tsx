"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { memo, useEffect } from "react";

/** Compteur fluide : la valeur glisse vers la nouvelle (tween), sans re-render à chaque image. Chiffres tabulaires : la largeur ne bouge pas. */
function AnimatedNumber({ value, decimals = 1, className = "" }: { value: number; decimals?: number; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => v.toFixed(decimals).replace(".", ","));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [value, reduce, mv]);
  return <motion.span className={`tabular-nums ${className}`}>{text}</motion.span>;
}
export default memo(AnimatedNumber);
