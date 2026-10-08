"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

// Apparition au scroll (CSS pur, grand écran seulement) et parallaxe subtile (figée en mouvement réduit et sur téléphone).

export function Reveal({ children, className = "" }: { children: ReactNode; /** Gardé pour compatibilité : l'apparition est en CSS pur (voir .reveal-block). */ delay?: number; className?: string }) {
  // Visible dès le rendu serveur : jamais de contenu caché en attendant du JavaScript (navigateurs intégrés de Twitch, Discord, Instagram…).
  return <div className={`reveal-block ${className}`}>{children}</div>;
}

/** Décale le visuel de `distance` px entre l'entrée et la sortie de l'écran. */
export function Parallax({ children, distance = 28, className = "" }: { children: ReactNode; distance?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  return (
    <motion.div ref={ref} style={reduce ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  );
}
