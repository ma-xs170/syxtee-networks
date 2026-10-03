"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Wordmark from "../Wordmark";
import { Container } from "../ui";
import Highlight from "../ui/Highlight";

// Accueil : le dashboard en trois vues cliquables, dans un cadre d'application comme la démo de SYXTEE STUDIO.
// Un seul sujet, pas de rotation automatique : on choisit la vue, la capture change en fondu.

const VIEWS = [
  {
    id: "ensemble",
    name: "Vue d'ensemble",
    text: "Statut du direct, activité sur 7 et 30 jours, derniers directs.",
    src: "/images/outils/accueil-v2.png",
    w: 3000,
    h: 2566,
    alt: "La vue d'ensemble du dashboard : activité en direct, dernier direct et temps de direct par jour.",
  },
  {
    id: "relais",
    name: "Mes relais",
    text: "Une adresse et une clé par appareil, en SRTLA, RTMP ou RIST.",
    src: "/images/outils/relais-v2.png",
    w: 2200,
    h: 2020,
    alt: "La page Mes relais du dashboard : un relais en live et deux relais actifs.",
  },
  {
    id: "sante",
    name: "Santé du flux",
    text: "Débit, latence, congestion et pertes, mesurés en temps réel.",
    src: "/images/outils/sante-v2.png",
    w: 2200,
    h: 2088,
    alt: "Santé du flux : débit, latence, congestion, pertes, courbe et liens SRTLA.",
  },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

export default function DashboardShowcase() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const v = VIEWS[i];

  return (
    <section id="dashboard" aria-labelledby="dashboard-titre" className="bg-field border-b border-line py-24">
      <Container className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
        <div>
          <Wordmark name="DASHBOARD" />
          <h2 id="dashboard-titre" className="h-section mt-5">
            <Highlight>Ton direct, en un coup d&apos;œil.</Highlight>
          </h2>
          <div role="tablist" aria-label="Vues du dashboard" className="mt-8 space-y-2">
            {VIEWS.map((x, k) => {
              const on = k === i;
              return (
                <button
                  key={x.id}
                  type="button"
                  role="tab"
                  id={`dash-tab-${x.id}`}
                  aria-selected={on}
                  aria-controls="dash-panel"
                  onClick={() => setI(k)}
                  className={`relative block w-full rounded-xl border px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
                    on ? "border-line-strong text-foreground" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="dash-active"
                      aria-hidden="true"
                      className="absolute inset-0 rounded-xl bg-foreground/[0.05]"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 36 }}
                    />
                  )}
                  <span className="relative block text-base font-medium">{x.name}</span>
                  <span className="relative mt-1 block text-sm leading-relaxed text-muted">{x.text}</span>
                </button>
              );
            })}
          </div>
        </div>

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
                <Image src={v.src} alt={v.alt} width={v.w} height={v.h} sizes="(min-width: 1024px) 760px, 100vw" className="h-full w-full object-cover object-top" />
              </motion.div>
            </AnimatePresence>
          </div>
          <figcaption className="mt-3 text-xs text-muted">Démo, données d&apos;exemple.</figcaption>
        </figure>
      </Container>
    </section>
  );
}
