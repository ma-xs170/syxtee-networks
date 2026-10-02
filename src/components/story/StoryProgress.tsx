"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, type MotionValue } from "motion/react";
import { activeScene, type SceneRange } from "./useSceneProgress";

// Indicateur « 01 / 02 / 03 » avec sa barre verticale qui se remplit au scroll.
export default function StoryProgress({ p, ranges }: { p: MotionValue<number>; ranges: SceneRange[] }) {
  const [active, setActive] = useState(0);
  useMotionValueEvent(p, "change", (v) => setActive(activeScene(v, ranges)));
  return (
    <div className="pointer-events-none absolute bottom-6 right-4 z-10 flex gap-3 sm:right-6 lg:bottom-10 lg:right-8" aria-hidden="true">
      <div className="relative w-px bg-foreground/20">
        <motion.div className="absolute inset-0 origin-top bg-accent" style={{ scaleY: p }} />
      </div>
      <ol className="flex flex-col gap-5 font-mono text-xs">
        {ranges.map((_, k) => {
          const n = String(k + 1).padStart(2, "0");
          return (
            <li key={n} className={`transition-colors duration-300 ${k === active ? "text-foreground" : "text-muted"}`}>
              {n}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
