"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

// Surlignage d'une partie de titre (un seul par titre, jamais dans un paragraphe), piloté par le défilement :
// le fond se remplit de gauche à droite quand le titre monte dans l'écran, et se vide si on remonte.
// Le texte bascule en couleur inversée au passage du fond. prefers-reduced-motion : surligné d'emblée.

export default function Highlight({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  // 0 quand le titre entre par le bas de l'écran, 1 quand il arrive à mi-hauteur.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.95", "start 0.5"] });
  const size = useTransform(scrollYProgress, [0, 1], ["0% 100%", "100% 100%"]);
  const color = useTransform(scrollYProgress, [0.35, 0.55], ["var(--foreground)", "var(--on-accent)"]);

  return (
    <motion.span
      ref={ref}
      style={reduce ? { backgroundSize: "100% 100%", color: "var(--on-accent)" } : { backgroundSize: size, color }}
      className="rounded-[2px] bg-[linear-gradient(var(--accent),var(--accent))] bg-left bg-no-repeat px-1 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]"
    >
      {children}
    </motion.span>
  );
}
