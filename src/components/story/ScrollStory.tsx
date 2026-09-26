"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useScroll, useSpring, type MotionValue } from "motion/react";
import { Container } from "@/components/ui";
import { StoryActiveContext, useReducedMotion } from "./StoryContext";
import StoryProgress from "./StoryProgress";
import StoryText, { Title, useFade } from "./StoryText";
import type { Band } from "./timeline";
import { defaultParagraphBands, defaultSceneBand, sceneRanges, useSceneProgress, type SceneRange } from "./useSceneProgress";

// Moteur de scrollytelling : un conteneur haut (nombre de scènes × 130vh par défaut), un bloc sticky collé sous la nav,
// et un seul progrès de scroll (0 → 1) lissé par un ressort, découpé automatiquement en scènes qui se chevauchent.
// Texte à gauche, visuel à droite (en haut sur mobile), indicateur 01 / 02 / 03 en bas à droite.
// prefers-reduced-motion : les scènes empilées, en statique, chacune figée à son moment clé.

type StoryContext = { global: MotionValue<number>; range: SceneRange };

export type StoryScene = {
  kicker: string;
  title: ReactNode;
  /** Niveau du titre : h1 pour la scène qui ouvre la page, h2 sinon. */
  titleAs?: "h1" | "h2";
  paragraphs: string[];
  /** Visuel de la scène, piloté par le progrès local (0 → 1). `ctx.global` donne le progrès de toute l'histoire. */
  render: (progress: MotionValue<number>, ctx: StoryContext) => ReactNode;
  /** Au-dessus du kicker (ex. fil d'Ariane). */
  header?: ReactNode;
  /** Sous le titre (ex. chiffres clés). */
  subtitle?: ReactNode;
  /** Après les paragraphes (ex. bouton). Avec `footerBand`, il prend la place des paragraphes pendant cette fenêtre. */
  footer?: ReactNode;
  /** Réglages fins, en progrès global. Par défaut : calculés à partir du découpage automatique. */
  band?: Band;
  paragraphBands?: Band[];
  footerBand?: Band;
  /** Progrès global auquel la scène est figée en version statique. Par défaut : le milieu de la scène. */
  staticAt?: number;
  /** Fond de la scène en version statique (ex. ciel étoilé). */
  staticBackdrop?: (global: MotionValue<number>) => ReactNode;
};

type Props = {
  scenes: StoryScene[];
  id?: string;
  className?: string;
  "aria-label"?: string;
  /** Hauteur totale du conteneur. Par défaut : scènes × 130vh. */
  height?: string;
  /** Début de chaque scène en progrès global. Par défaut : découpage égal. */
  starts?: readonly number[];
  /** Largeur des fondus croisés entre scènes. */
  overlap?: number;
  /** Visuel persistant, commun à toutes les scènes (remplace les `render` des scènes en version animée). */
  stage?: (global: MotionValue<number>) => ReactNode;
  /** Fond plein cadre derrière le contenu du bloc sticky (ex. ciel étoilé, voile). */
  backdrop?: (global: MotionValue<number>) => ReactNode;
};

const spring = { stiffness: 180, damping: 36, restDelta: 0.0002 };

// Le bloc sticky se colle juste sous la nav (h-16 = 64 px) : la progression démarre quand le haut du conteneur y arrive.
const NAV = 64;

function SceneVisual({ scene, p, range, band }: { scene: StoryScene; p: MotionValue<number>; range: SceneRange; band: Band }) {
  const local = useSceneProgress(p, range);
  const { opacity } = useFade(p, band, 0);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      {scene.render(local, { global: p, range })}
    </motion.div>
  );
}

function AnimatedStory({ scenes, height, ranges, overlap, stage, backdrop }: Required<Pick<Props, "scenes" | "overlap">> & Pick<Props, "stage" | "backdrop"> & { height: string; ranges: SceneRange[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: [`start ${NAV}px`, "end end"] });
  const p = useSpring(scrollYProgress, spring);

  // Pause des canvas quand le bloc sticky n'est pas à l'écran.
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = sticky.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const bands = scenes.map((s, i) => s.band ?? defaultSceneBand(i, ranges, overlap));
  const text = scenes.map((s, i) => ({
    ...s,
    band: bands[i],
    paragraphBands: s.paragraphBands ?? defaultParagraphBands(ranges[i], s.paragraphs.length),
    // footerBand explicite : le footer remplace les paragraphes (ex. finale Starlink). Sinon il apparaît dessous.
    footerBand: s.footer ? (s.footerBand ?? ([ranges[i].start + 0.02, ranges[i].start + 0.06, 2, 3] as Band)) : undefined,
    footerReplaces: s.footerBand !== undefined,
  }));

  return (
    <StoryActiveContext.Provider value={active}>
      <div ref={ref} className="relative" style={{ height }}>
        <div ref={sticky} className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden lg:h-[calc(100vh-4rem)]">
          {backdrop?.(p)}

          <div className="relative mx-auto flex h-full max-w-6xl flex-col px-4 pt-2 sm:px-6 lg:grid lg:pt-0 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
            <div className="h-[55%] shrink-0 lg:order-2 lg:h-full lg:py-8">
              {stage ? (
                stage(p)
              ) : (
                <div className="relative h-full w-full">
                  {scenes.map((s, i) => (
                    <SceneVisual key={s.kicker} scene={s} p={p} range={ranges[i]} band={bands[i]} />
                  ))}
                </div>
              )}
            </div>
            <div className="grid flex-1 items-center pb-8 pr-12 lg:order-1 lg:pb-0 lg:pr-0">
              <StoryText p={p} scenes={text} />
            </div>
          </div>

          <StoryProgress p={p} ranges={ranges} />
        </div>
      </div>
    </StoryActiveContext.Provider>
  );
}

// Version statique : chaque scène figée à son moment clé.
function StaticScene({ scene, range }: { scene: StoryScene; range: SceneRange }) {
  const at = scene.staticAt ?? (range.start + range.end) / 2;
  const global = useMotionValue(at);
  const local = useSceneProgress(global, range);
  return (
    <div className="relative overflow-hidden border-b border-line py-16 last:border-b-0">
      {scene.staticBackdrop?.(global)}
      <Container className="relative grid items-center gap-10 lg:grid-cols-2">
        <div>
          {scene.header}
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{scene.kicker}</p>
          <Title as={scene.titleAs} className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {scene.title}
          </Title>
          {scene.subtitle}
          <div className="mt-6 space-y-4">
            {scene.paragraphs.map((t) => (
              <p key={t} className="text-base leading-relaxed text-muted">
                {t}
              </p>
            ))}
          </div>
          {scene.footer && <div className="mt-8">{scene.footer}</div>}
        </div>
        <div className="aspect-square w-full">{scene.render(local, { global, range })}</div>
      </Container>
    </div>
  );
}

export default function ScrollStory({ scenes, id, className = "", height, starts, overlap = 0.05, stage, backdrop, ...rest }: Props) {
  const reduced = useReducedMotion();
  const ranges = sceneRanges(scenes.length, starts);
  return (
    <section id={id} aria-label={rest["aria-label"]} className={`relative ${className}`}>
      {!reduced && (
        <div className="motion-reduce:hidden">
          <AnimatedStory
            scenes={scenes}
            height={height ?? `${scenes.length * 130}vh`}
            ranges={ranges}
            overlap={overlap}
            stage={stage}
            backdrop={backdrop}
          />
        </div>
      )}
      <div className="hidden motion-reduce:block">
        {scenes.map((s, i) => (
          <StaticScene key={s.kicker} scene={s} range={ranges[i]} />
        ))}
      </div>
    </section>
  );
}
