"use client";

import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import RelayBox from "./RelayBox";
import { useBoxState } from "./liveStore";

/** Gros rendu du boîtier : rotation douce au scroll, léger basculement et reflet qui suivent la souris. Tout en motion values (aucun re-render). */
export default function HeroBox() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const box = useBoxState();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scrollRot = useTransform(scrollYProgress, [0, 1], [10, -10]);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [6, -6]), { stiffness: 120, damping: 20 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-8, 8]), { stiffness: 120, damping: 20 });
  const glow = useTransform(mx, [-1, 1], ["20%", "80%"]);
  const rz = useTransform(scrollRot, (v) => v / 8);
  const shine = useTransform(glow, (g) => `radial-gradient(420px circle at ${g} 20%, rgba(255,255,255,0.35), transparent 60%)`);
  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-5xl [perspective:1200px]"
      onPointerMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
        my.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-1/2 h-2/3 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--foreground)_14%,transparent),transparent_70%)] blur-2xl" />
      <motion.div style={reduce ? undefined : { rotateX: rx, rotateY: ry, rotateZ: rz }} className="relative [transform-style:preserve-3d]">
        <RelayBox live={box.status !== "offline"} leds={box.leds} />
        {!reduce && <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ background: shine }} />}
      </motion.div>
    </div>
  );
}
