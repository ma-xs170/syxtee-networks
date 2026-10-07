"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

// Récit défilant : le téléphone reste en place pendant que l'on descend, et son écran change avec chaque phrase (vraies captures de
// l'interface). Le mouvement sert à une chose : montrer une fonction après l'autre, dans l'ordre où on s'en sert en direct.
// prefers-reduced-motion : pas de défilement piloté, les quatre étapes se lisent à la suite, chacune avec sa capture.

export type Step = { title: string; text: string; src: string; alt: string };

const N = 4;

/** Poids d'une étape dans [0, 1] : plein autour de son centre, nul au-delà (la première et la dernière restent pleines à leur bord).
 *  Calculé par fonction (pas par plages) : les plages sortiraient de [0, 1] pour la première et la dernière étape. */
function weight(v: number, i: number) {
  const c = (i + 0.5) / N;
  const w = 1 / N;
  if (i === 0 && v < c) return 1;
  if (i === N - 1 && v > c) return 1;
  const d = Math.abs(v - c) / w;
  return Math.max(0, Math.min(1, (0.62 - d) / 0.24));
}
const useWindow = (p: MotionValue<number>, i: number) => useTransform(p, (v) => weight(v, i));

function Copy({ step, i, p }: { step: Step; i: number; p: MotionValue<number> }) {
  const opacity = useWindow(p, i);
  const c = (i + 0.5) / N;
  const y = useTransform(p, (v) => Math.max(-24, Math.min(24, ((c - v) / 0.2) * 24)));
  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-0 top-0 lg:top-1/2 lg:-translate-y-1/2">
      <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{step.title}</h3>
      <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-muted sm:text-lg">{step.text}</p>
    </motion.div>
  );
}

function Shot({ step, i, p }: { step: Step; i: number; p: MotionValue<number> }) {
  const opacity = useWindow(p, i);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      <Image src={step.src} alt={step.alt} fill sizes="280px" className="object-cover object-top" priority={i === 0} />
    </motion.div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full rounded-[18%/8.3%] border-[1.5px] border-foreground/80 bg-black p-[3.5%] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]" style={{ aspectRatio: "9 / 19.5" }}>
      <div className="relative h-full w-full overflow-hidden rounded-[14%/6.5%] bg-black">
        {children}
        <div aria-hidden="true" className="absolute left-1/2 top-[2.2%] h-[3.6%] w-[30%] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/15" />
      </div>
    </div>
  );
}

export default function PhoneStory({ steps }: { steps: Step[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  if (reduce)
    return (
      <ol className="mx-auto grid max-w-5xl gap-20 px-4 py-20 sm:px-6">
        {steps.map((s) => (
          <li key={s.title} className="grid items-center gap-10 sm:grid-cols-2">
            <div>
              <h3 className="text-3xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-muted">{s.text}</p>
            </div>
            <div className="mx-auto w-full max-w-[16rem]">
              <Frame>
                <Image src={s.src} alt={s.alt} fill sizes="256px" className="object-cover object-top" />
              </Frame>
            </div>
          </li>
        ))}
      </ol>
    );

  return (
    <div ref={ref} className="relative h-[420vh]">
      <div className="sticky top-0 mx-auto grid h-dvh max-w-6xl grid-rows-[auto_1fr] items-center gap-6 px-4 pb-8 pt-20 sm:px-6 lg:grid-cols-2 lg:grid-rows-1 lg:gap-16 lg:py-0">
        <div className="mx-auto h-[min(54dvh,32rem)] lg:order-2 lg:h-[min(78dvh,46rem)]">
          <div className="h-full" style={{ aspectRatio: "9 / 19.5" }}>
            <Frame>
              {steps.map((s, i) => (
                <Shot key={s.title} step={s} i={i} p={scrollYProgress} />
              ))}
            </Frame>
          </div>
        </div>
        <div className="relative h-full lg:order-1 lg:h-[24rem]">
          {steps.map((s, i) => (
            <Copy key={s.title} step={s} i={i} p={scrollYProgress} />
          ))}
        </div>
      </div>
    </div>
  );
}
