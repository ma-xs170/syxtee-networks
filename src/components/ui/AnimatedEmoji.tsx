"use client";

import { motion, useAnimate, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Émoticône animée : une petite pop à l'apparition, puis une animation propre à l'émoticône à chaque interaction
// (survol, toucher, clic, focus clavier). Soleil qui tourne, lune qui se balance, drapeau qui flotte, le reste rebondit.
// Mouvement = retour d'état (le geste est pris en compte) ; prefers-reduced-motion : aucune animation.

type Kind = "spin" | "sway" | "wave" | "bounce";

const KEYFRAMES: Record<Kind, Record<string, number[]>> = {
  spin: { rotate: [0, 180, 360], scale: [1, 1.3, 1] },
  sway: { rotate: [0, -18, 14, -8, 0], y: [0, -4, 0, -2, 0] },
  wave: { rotate: [0, 14, -8, 14, -4, 0], x: [0, 2, 0, 2, 0] },
  bounce: { y: [0, -10, 0, -5, 0], scale: [1, 1.2, 0.92, 1.08, 1] },
};

const KIND_OF: Record<string, Kind> = { "☀️": "spin", "🌤️": "spin", "🌙": "sway", "👋": "wave" };
const kindOf = (emoji: string): Kind => KIND_OF[emoji] ?? (/^\p{Regional_Indicator}{2}$/u.test(emoji.trim()) ? "wave" : "bounce");

export default function AnimatedEmoji({ children, kind, className = "" }: { children: string; kind?: Kind; className?: string }): ReactNode {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const k = kind ?? kindOf(children);

  if (reduce) {
    return (
      <span aria-hidden="true" className={className}>
        {children}
      </span>
    );
  }

  const play = () => {
    if (scope.current) void animate(scope.current, KEYFRAMES[k], { duration: 0.7, ease: "easeInOut" });
  };

  return (
    <motion.span
      ref={scope}
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 14 }}
      onHoverStart={play}
      onTap={play}
      onFocus={play}
      className={`inline-block origin-center cursor-default select-none ${className}`}
    >
      {children}
    </motion.span>
  );
}
