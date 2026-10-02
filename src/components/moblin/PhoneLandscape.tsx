"use client";

import type { ReactNode } from "react";
import { motion, type MotionValue } from "motion/react";

// iPhone filaire en paysage (orientation d'un live IRL) : cadre fin, Dynamic Island à gauche, boutons latéraux,
// reflet subtil. `rotateY` / `scale` permettent l'arrivée en rotation 3D. L'écran (enfants) est rempli en entier
// et sert de conteneur de taille (unités cqw / cqh pour l'interface).

export default function PhoneLandscape({
  children,
  rotateY,
  scale,
  className = "",
}: {
  children: ReactNode;
  rotateY?: MotionValue<number>;
  scale?: MotionValue<number>;
  className?: string;
}) {
  return (
    <div className={`relative w-full [perspective:1400px] ${className}`}>
      <motion.div
        style={{ rotateY, scale }}
        className="relative aspect-[844/390] w-full rounded-[11%/24%] border-[1.5px] border-foreground/80 bg-background p-[1.4%] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] [transform-style:preserve-3d]"
      >
        {/* Boutons latéraux : volume en haut, alimentation en bas */}
        <span className="absolute -top-[3px] left-[16%] h-[3px] w-[7%] rounded-full border border-foreground/70" aria-hidden="true" />
        <span className="absolute -top-[3px] left-[25%] h-[3px] w-[7%] rounded-full border border-foreground/70" aria-hidden="true" />
        <span className="absolute -top-[3px] left-[9%] h-[3px] w-[3.5%] rounded-full border border-foreground/70" aria-hidden="true" />
        <span className="absolute -bottom-[3px] left-[22%] h-[3px] w-[11%] rounded-full border border-foreground/70" aria-hidden="true" />

        <div className="relative h-full w-full overflow-hidden rounded-[9.5%/21%] [container-type:size]">
          {children}
          {/* Dynamic Island (à gauche en paysage) */}
          <span className="absolute left-[2.2%] top-1/2 h-[30%] w-[3.4%] -translate-y-1/2 rounded-full bg-background ring-1 ring-foreground/15" aria-hidden="true" />
          {/* Reflet */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.08] via-transparent via-40% to-transparent" aria-hidden="true" />
        </div>
      </motion.div>
    </div>
  );
}
