"use client";

import type { ReactNode } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { band, ramp, type Band } from "./timeline";

// Colonne de texte d'un ScrollStory : un bloc par scène, empilés dans la même case de grille.
// Chaque bloc (et chaque paragraphe) apparaît en fondu + glissement vers le haut selon sa fenêtre [a, b, c, d].

export type StoryTextScene = {
  kicker: string;
  title: ReactNode;
  paragraphs: string[];
  header?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  band: Band;
  paragraphBands: Band[];
  footerBand?: Band;
};

/** Opacité + léger glissement vers le haut, selon une fenêtre [a, b, c, d]. */
export function useFade(p: MotionValue<number>, [a, b, c, d]: Band, dist: number) {
  const opacity = useTransform(p, (v) => band(v, a, b, c, d));
  const y = useTransform(p, (v) => dist * (1 - ramp(v, a, b)) - dist * ramp(v, c, d));
  return { opacity, y };
}

function Paragraph({ p, range, children }: { p: MotionValue<number>; range: Band; children: ReactNode }) {
  const style = useFade(p, range, 16);
  return (
    <motion.p style={style} className="[grid-area:1/1] text-base leading-relaxed text-muted sm:text-lg">
      {children}
    </motion.p>
  );
}

function FooterSlot({ p, range, children }: { p: MotionValue<number>; range: Band; children: ReactNode }) {
  const { opacity, y } = useFade(p, range, 16);
  const visibility = useTransform(opacity, (o) => (o > 0.02 ? "visible" : "hidden"));
  return (
    <motion.div style={{ opacity, y, visibility }} className="[grid-area:1/1] self-start">
      {children}
    </motion.div>
  );
}

function SceneBlock({ p, s }: { p: MotionValue<number>; s: StoryTextScene }) {
  const style = useFade(p, s.band, 28);
  return (
    <motion.div style={style} className="[grid-area:1/1] self-center">
      {s.header}
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{s.kicker}</p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{s.title}</h2>
      {s.subtitle}
      <div className="mt-4 grid sm:mt-6">
        {s.paragraphs.map((t, k) => (
          <Paragraph key={t} p={p} range={s.paragraphBands[k]}>
            {t}
          </Paragraph>
        ))}
        {s.footer && s.footerBand && (
          <FooterSlot p={p} range={s.footerBand}>
            {s.footer}
          </FooterSlot>
        )}
      </div>
    </motion.div>
  );
}

export default function StoryText({ p, scenes }: { p: MotionValue<number>; scenes: StoryTextScene[] }) {
  return (
    <>
      {scenes.map((s) => (
        <SceneBlock key={s.kicker} p={p} s={s} />
      ))}
    </>
  );
}
