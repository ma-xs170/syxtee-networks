"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Le dashboard en trois vues cliquables, dans un cadre d'application. Pas de rotation automatique :
// on choisit la vue, la capture change en fondu.

const VIEWS = [
  { id: "ensemble", name: "Vue d'ensemble", src: "/images/outils/accueil-v2.png", w: 3000, h: 2566, alt: "La vue d'ensemble du dashboard : activité en direct, dernier direct et temps de direct par jour." },
  { id: "relais", name: "Mes relais", src: "/images/outils/relais-v2.png", w: 2200, h: 2020, alt: "La page Mes relais du dashboard : un relais en live et deux relais actifs." },
  { id: "sante", name: "Santé du flux", src: "/images/outils/sante-v2.png", w: 2200, h: 2088, alt: "Santé du flux : débit, latence, congestion, pertes, courbe et liens SRTLA." },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

export default function DashboardViews() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const v = VIEWS[i];
  return (
    <figure>
      <div id="dash-panel" role="tabpanel" aria-labelledby={`dash-tab-${v.id}`} className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
        <AnimatePresence initial={false}>
          <motion.div
            key={v.id}
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <Image src={v.src} alt={v.alt} width={v.w} height={v.h} sizes="(min-width: 1024px) 560px, 100vw" className="h-full w-full object-cover object-top" />
          </motion.div>
        </AnimatePresence>
      </div>
      <div role="tablist" aria-label="Vues du dashboard" className="mt-4 flex flex-wrap items-center gap-2">
        {VIEWS.map((x, k) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`dash-tab-${x.id}`}
            aria-selected={k === i}
            aria-controls="dash-panel"
            onClick={() => setI(k)}
            className={`min-h-10 rounded-full border px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
              k === i ? "border-line-strong bg-foreground/10 text-foreground" : "border-line text-muted hover:text-foreground"
            }`}
          >
            {x.name}
          </button>
        ))}
        <figcaption className="ml-auto text-xs text-muted">Démo, données d&apos;exemple.</figcaption>
      </div>
    </figure>
  );
}
