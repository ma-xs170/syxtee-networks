"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";
import { MiniDrawing, applyMiniFrame, miniFrame } from "@/components/illustrations/mini3d";

// Scène 1 : le Mini en vue éclatée. La géométrie est recalculée à chaque changement de scroll
// et écrite directement dans le DOM (pas de re-render React).
export default function MiniExploded({ p }: { p: MotionValue<number> }) {
  const ref = useRef<SVGGElement>(null);
  const els = useRef<Map<string, Element> | null>(null);
  const last = useRef(-1);
  const [initial] = useState(() => miniFrame(p.get()));

  const update = (v: number) => {
    // Au-delà de la scène 1, le Mini est invisible : inutile de recalculer.
    if (v > 0.37 && last.current > 0.37) return;
    if (!els.current && ref.current) {
      els.current = new Map();
      ref.current.querySelectorAll("[data-k]").forEach((el) => els.current!.set(el.getAttribute("data-k")!, el));
    }
    if (!els.current) return;
    last.current = v;
    applyMiniFrame(els.current, miniFrame(v));
  };

  useMotionValueEvent(p, "change", update);
  useEffect(() => {
    update(p.get());
  }, [p]);

  return (
    <g ref={ref}>
      <MiniDrawing f={initial} labels />
    </g>
  );
}
