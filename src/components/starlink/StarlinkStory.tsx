"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Container, DiscordButton } from "@/components/ui";
import MiniExploded from "./MiniExploded";
import { FlowOverlay, GroundLayer, SkyLayer } from "./SkyGround";
import Starfield from "./Starfield";
import { FINALE_BAND, PARA_BANDS, SCENE_BANDS, band, ramp, sceneIndex, type Band } from "./timeline";

// Scrollytelling Starlink en 3 scènes : le Mini en squelette → là-haut → au sol.
// Un conteneur de 400vh, un bloc sticky de 100vh, tout piloté par scrollYProgress (0 → 1) lissé par un ressort.
// prefers-reduced-motion : les 3 scènes empilées, en statique.

const scenes = [
  {
    kicker: "01 · Comment ça marche",
    title: "Une antenne qui vise le ciel toute seule.",
    paras: [
      "L'antenne à réseau phasé oriente son faisceau électroniquement vers les satellites, sans aucune pièce mobile.",
      "Le routeur Wi-Fi est intégré : ton iPhone s'y connecte directement, sans boîtier en plus.",
      "1,10 kg, alimenté en USB-C : une powerbank suffit.",
    ],
  },
  {
    kicker: "02 · En orbite",
    title: "Des milliers de satellites au-dessus de toi.",
    paras: [
      "Starlink utilise des satellites en orbite basse : bien plus proches que les satellites classiques, donc beaucoup moins de latence.",
      "Ils défilent en permanence : ton antenne passe de l'un à l'autre sans couper la connexion.",
    ],
  },
  {
    kicker: "03 · Réception",
    title: "Le signal arrive, ton live part.",
    paras: [
      "Le Mini reçoit le signal du satellite et le partage en Wi-Fi.",
      "Moblin combine ce Wi-Fi avec ta 4G/5G : si le ciel est masqué, le réseau mobile prend le relais.",
      "Le relais SYXTEE recolle le tout et l'envoie dans ton OBS.",
    ],
  },
];

const keyFigures = [
  { v: "1,10 kg", l: "Poids" },
  { v: "Wi-Fi 5", l: "Intégré" },
  { v: "USB-C 100 W", l: "Alimentation" },
  { v: "IP67", l: "Pluie et poussière" },
];

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(reducedQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useReducedMotion = () =>
  useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

// Opacité + léger glissement vers le haut, selon une fenêtre [a, b, c, d].
function useFade(p: MotionValue<number>, [a, b, c, d]: Band, dist: number) {
  const opacity = useTransform(p, (v) => band(v, a, b, c, d));
  const y = useTransform(p, (v) => dist * (1 - ramp(v, a, b)) - dist * ramp(v, c, d));
  return { opacity, y };
}

/** Carré centré qui occupe la plus grande place possible : SVG 600 × 600 + calques HTML alignés dessus. */
function Stage({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
  return (
    <div className="relative h-full w-full [container-type:size]">
      <div className="absolute left-1/2 top-1/2 aspect-square w-[min(100cqw,100cqh)] -translate-x-1/2 -translate-y-1/2">
        <svg viewBox="0 0 600 600" className="absolute inset-0 h-full w-full overflow-visible text-foreground" fill="none" aria-hidden="true">
          {children}
        </svg>
        {overlay}
      </div>
    </div>
  );
}

function Finale() {
  return (
    <div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4 lg:grid-cols-2">
        {keyFigures.map((k) => (
          <div key={k.v} className="bg-black px-4 py-3">
            <dt className="sr-only">{k.l}</dt>
            <dd className="font-mono text-base text-foreground sm:text-lg">{k.v}</dd>
            <dd className="mt-0.5 text-xs text-muted">{k.l}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5">
        <DiscordButton />
      </div>
    </div>
  );
}

function Para({ p, range, children }: { p: MotionValue<number>; range: Band; children: ReactNode }) {
  const style = useFade(p, range, 16);
  return (
    <motion.p style={style} className="[grid-area:1/1] text-base leading-relaxed text-muted sm:text-lg">
      {children}
    </motion.p>
  );
}

function FinaleSlot({ p }: { p: MotionValue<number> }) {
  const { opacity, y } = useFade(p, FINALE_BAND, 16);
  const visibility = useTransform(opacity, (o) => (o > 0.02 ? "visible" : "hidden"));
  return (
    <motion.div style={{ opacity, y, visibility }} className="[grid-area:1/1] self-start">
      <Finale />
    </motion.div>
  );
}

function SceneText({ p, i }: { p: MotionValue<number>; i: number }) {
  const s = scenes[i];
  const style = useFade(p, SCENE_BANDS[i], 28);
  return (
    <motion.div style={style} className="[grid-area:1/1] self-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{s.kicker}</p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{s.title}</h2>
      <div className="mt-4 grid sm:mt-6">
        {s.paras.map((t, k) => (
          <Para key={t} p={p} range={PARA_BANDS[i][k]}>
            {t}
          </Para>
        ))}
        {i === 2 && <FinaleSlot p={p} />}
      </div>
    </motion.div>
  );
}

function Indicator({ p }: { p: MotionValue<number> }) {
  const [active, setActive] = useState(0);
  useMotionValueEvent(p, "change", (v) => setActive(sceneIndex(v)));
  return (
    <div className="pointer-events-none absolute bottom-6 right-4 z-10 flex gap-3 sm:right-6 lg:bottom-10 lg:right-8" aria-hidden="true">
      <div className="relative w-px bg-white/15">
        <motion.div className="absolute inset-0 origin-top bg-white" style={{ scaleY: p }} />
      </div>
      <ol className="flex flex-col gap-5 font-mono text-xs">
        {["01", "02", "03"].map((n, k) => (
          <li key={n} className={`transition-colors duration-300 ${k === active ? "text-foreground" : "text-muted"}`}>
            {n}
          </li>
        ))}
      </ol>
    </div>
  );
}

function AnimatedStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 180, damping: 36, restDelta: 0.0002 });
  const skyO = useTransform(p, (v) => ramp(v, 0.3, 0.37));

  return (
    <div ref={ref} className="relative h-[400vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden lg:h-screen">
        <Starfield p={p} className="absolute inset-0 h-full w-full" />
        {/* Voile derrière le texte pour garder la lisibilité par-dessus les étoiles */}
        <motion.div
          style={{ opacity: skyO }}
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/70 via-40% to-transparent to-55% lg:bg-gradient-to-r lg:from-black/85 lg:via-black/50 lg:via-35% lg:to-transparent lg:to-55%"
        />

        <div className="relative mx-auto flex h-full max-w-6xl flex-col px-4 pt-16 sm:px-6 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
          <div className="h-[55%] shrink-0 lg:order-2 lg:h-full lg:py-8">
            <Stage overlay={<FlowOverlay p={p} />}>
              <SkyLayer p={p} />
              <GroundLayer p={p} />
              <MiniExploded p={p} />
            </Stage>
          </div>
          <div className="grid flex-1 items-center pb-8 pr-12 lg:order-1 lg:pb-0 lg:pr-0">
            {scenes.map((s, i) => (
              <SceneText key={s.kicker} p={p} i={i} />
            ))}
          </div>
        </div>

        <Indicator p={p} />
      </div>
    </div>
  );
}

// Version statique (prefers-reduced-motion) : chaque scène figée à son moment clé.
function StaticScene({ i, v, children }: { i: number; v: number; children: (p: MotionValue<number>) => ReactNode }) {
  const p = useMotionValue(v);
  const s = scenes[i];
  return (
    <div className="relative overflow-hidden border-b border-line py-16 last:border-b-0">
      {i === 1 && <Starfield p={p} animate={false} className="absolute inset-0 h-full w-full opacity-70" />}
      <Container className="relative grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{s.kicker}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{s.title}</h2>
          <div className="mt-6 space-y-4">
            {s.paras.map((t) => (
              <p key={t} className="text-base leading-relaxed text-muted">
                {t}
              </p>
            ))}
          </div>
          {i === 2 && (
            <div className="mt-8">
              <Finale />
            </div>
          )}
        </div>
        <div className="aspect-square w-full">{children(p)}</div>
      </Container>
    </div>
  );
}

function StaticStory() {
  return (
    <div>
      <StaticScene i={0} v={0.15}>
        {(p) => (
          <Stage>
            <MiniExploded p={p} />
          </Stage>
        )}
      </StaticScene>
      <StaticScene i={1} v={0.55}>
        {(p) => (
          <Stage>
            <SkyLayer p={p} />
          </Stage>
        )}
      </StaticScene>
      <StaticScene i={2} v={0.97}>
        {(p) => (
          <Stage overlay={<FlowOverlay p={p} />}>
            <SkyLayer p={p} />
            <GroundLayer p={p} />
          </Stage>
        )}
      </StaticScene>
    </div>
  );
}

export default function StarlinkStory() {
  const reduced = useReducedMotion();
  return (
    <section aria-label="Comment fonctionne le Starlink Mini" className="relative border-b border-line">
      {!reduced && (
        <div className="motion-reduce:hidden">
          <AnimatedStory />
        </div>
      )}
      <div className="hidden motion-reduce:block">
        <StaticStory />
      </div>
    </section>
  );
}
