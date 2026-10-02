"use client";

import { useRef } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { ramp } from "@/components/story/timeline";
import { useStoryClock } from "@/components/story/useStoryClock";
import Street from "./journey/Street";

// Miniature de la scène 1 (« Dans la rue ») qui tourne en boucle dans le hero de l'accueil :
// le streamer traverse la rue en 16 s, puis recommence. En pause hors écran, figée en reduced-motion.
const LOOP = 16;

export default function HeroStreet() {
  const ref = useRef<HTMLDivElement>(null);
  const time = useStoryClock(ref);
  const walk = useTransform(time, (s) => ((s + 5) % LOOP) / LOOP);
  const waves = useMotionValue(1);
  const opacity = useTransform(walk, (w) => Math.min(ramp(w, 0, 0.06), 1 - ramp(w, 0.94, 1)));

  return (
    <div ref={ref} className="relative">
      <svg viewBox="0 120 600 420" className="h-auto w-full text-foreground" fill="none" role="img" aria-label="Un streamer IRL marche dans une rue des Antilles, son téléphone envoie la vidéo en 4G, 5G et Wi-Fi.">
        <motion.g style={{ opacity }}>
          <Street walk={walk} waves={waves} time={time} />
        </motion.g>
      </svg>
    </div>
  );
}
