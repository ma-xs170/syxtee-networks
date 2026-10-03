"use client";

import { motion, useReducedMotion } from "motion/react";

// Fond de survol qui glisse d'une entrée à l'autre d'une liste (menus, barres latérales), comme sur x.ai : un seul fond
// partagé (`layoutId`), qui se déplace en ressort au lieu de s'allumer sur chaque ligne. À poser dans un lien
// `relative`, avant son contenu (le contenu en `relative z-10`). `id` : un nom par liste, pour que deux listes ne se mélangent pas.

export default function GlidePill({ show, id, className = "rounded-lg" }: { show: boolean; id: string; className?: string }) {
  const reduce = useReducedMotion();
  if (!show) return null;
  return (
    <motion.span
      layoutId={id}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 bg-foreground/[0.09] ${className}`}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40, mass: 0.7 }}
    />
  );
}
