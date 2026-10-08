"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Apparition au défilement : le bloc monte de quelques pixels et se fond, une seule fois. Sert la hiérarchie : on lit la page dans l'ordre.
// prefers-reduced-motion : affiché d'emblée.
export default function Reveal({ children, className = "", delay = 0, as = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "article" | "section" }) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
