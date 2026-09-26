"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";
import { useReducedMotion, useStoryActive } from "@/components/story/StoryContext";
import a from "@/components/illustrations/anim.module.css";

export { a as anim };

// Kit commun des scènes de /fonctionnement (repère de scène 600 × 600).

export { band, clamp01, easeOut, lerp, ramp } from "@/components/story/timeline";

/** Progrès local de la scène en valeur React (re-render seulement quand il change : 0 ou 1 hors de la scène). */
export function useV(progress: MotionValue<number>) {
  const [v, setV] = useState(() => progress.get());
  useMotionValueEvent(progress, "change", (x) => setV(Math.round(x * 2000) / 2000));
  return v;
}

const narrowQuery = "(max-width: 639px)";
const subscribeNarrow = (cb: () => void) => {
  const m = window.matchMedia(narrowQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/** Vrai sur mobile : moins de particules (poissons, bulles, paquets). */
export const useNarrow = () => useSyncExternalStore(subscribeNarrow, () => window.matchMedia(narrowQuery).matches, () => false);

/** Groupe de scène : trait filaire constant ; animations CSS en pause quand l'histoire est hors écran. */
export function SceneG({ children, opacity = 1 }: { children: ReactNode; opacity?: number }) {
  const active = useStoryActive();
  return (
    <g
      className={`svg-hairline ${active === false ? "illu-still" : ""}`}
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={opacity}
    >
      {children}
    </g>
  );
}

/** Texte mono des scènes (taille lisible en mobile comme en desktop). */
export function T({
  x,
  y,
  children,
  anchor = "start",
  strong = false,
  size = "md",
  live = false,
  opacity,
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  strong?: boolean;
  size?: "sm" | "md" | "lg";
  live?: boolean;
  opacity?: number;
}) {
  const cls = { sm: "text-[14px] lg:text-[10px]", md: "text-[16px] lg:text-[12px]", lg: "text-[22px] lg:text-[17px]" }[size];
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      stroke="none"
      fill={live ? "var(--live)" : strong ? "var(--foreground)" : "var(--muted)"}
      className={`font-mono ${cls}`}
      letterSpacing="0.06em"
      opacity={opacity}
    >
      {children}
    </text>
  );
}

/** Le paquet vidéo suivi tout au long du trajet. */
export const PACKET = "#0427";

/** Paquet : petit carré lumineux numéroté. `hero` : le paquet #0427 (halo + point rouge). */
export function Packet({ x, y, n = PACKET, hero = false, size = 14, label = true, opacity = 1 }: {
  x: number;
  y: number;
  n?: string;
  hero?: boolean;
  size?: number;
  label?: boolean;
  opacity?: number;
}) {
  const h = size / 2;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} opacity={opacity}>
      {hero && <circle r={size * 1.6} fill="url(#packet-glow)" stroke="none" />}
      <rect x={-h} y={-h} width={size} height={size} rx={2} fill="currentColor" fillOpacity={hero ? 0.9 : 0.25} />
      {hero && <circle cx={h} cy={-h} r={2.2} fill="var(--live)" stroke="none" />}
      {label && (
        <T x={0} y={-h - 7} anchor="middle" size="sm" strong={hero}>
          {n}
        </T>
      )}
    </g>
  );
}

/** Dégradés partagés (à placer une fois par SVG). */
export function SceneDefs() {
  return (
    <defs>
      <radialGradient id="packet-glow">
        <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="plate-glow">
        <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="fade-down" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.07" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

type P = [number, number];
/** Point sur une Bézier quadratique. */
export function bez(a: P, c: P, b: P, t: number): P {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}
export const qPath = (a: P, c: P, b: P) => `M${a[0]} ${a[1]}Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`;

// Horloge partagée : une seule boucle requestAnimationFrame pour toutes les animations en JS des scènes.
const subscribers = new Set<(t: number) => void>();
let raf = 0;
const tick = (now: number) => {
  subscribers.forEach((f) => f(now / 1000));
  raf = subscribers.size ? requestAnimationFrame(tick) : 0;
};
function subscribe(f: (t: number) => void) {
  subscribers.add(f);
  if (!raf) raf = requestAnimationFrame(tick);
  return () => {
    subscribers.delete(f);
  };
}

/** Appelle `f(t)` à chaque image tant que l'histoire est à l'écran (rien en version statique ni en reduced-motion). */
export function useTicker(f: (t: number) => void, enabled = true) {
  const active = useStoryActive();
  const reduced = useReducedMotion();
  const ref = useRef(f);
  useEffect(() => {
    ref.current = f;
  });
  useEffect(() => {
    if (!enabled || active !== true || reduced) return;
    return subscribe((t) => ref.current(t));
  }, [enabled, active, reduced]);
}

/** Paquets qui circulent en boucle le long d'une Bézier quadratique (a → b, contrôle c). */
export function Flow({ a, c, b, count, duration = 2.4, size = 7, opacity = 1 }: {
  a: P;
  c: P;
  b: P;
  count: number;
  duration?: number;
  size?: number;
  opacity?: number;
}) {
  const g = useRef<SVGGElement>(null);
  const place = (t: number) => {
    const kids = g.current?.children;
    if (!kids) return;
    for (let i = 0; i < kids.length; i++) {
      const u = (((t / duration + i / count) % 1) + 1) % 1;
      const [x, y] = bez(a, c, b, u);
      kids[i].setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      kids[i].setAttribute("opacity", String(Math.min(1, u * 8, (1 - u) * 8).toFixed(2)));
    }
  };
  useTicker(place);
  return (
    <g ref={g} opacity={opacity}>
      {Array.from({ length: count }, (_, i) => {
        const [x, y] = bez(a, c, b, i / count);
        return (
          <rect
            key={i}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
            x={-size / 2}
            y={-size / 2}
            width={size}
            height={size}
            rx={1.5}
            fill="currentColor"
            fillOpacity={0.55}
            stroke="none"
          />
        );
      })}
    </g>
  );
}

/** Pylône d'antenne-relais filaire, pied en (x, y), hauteur h. */
export function Pylon({ x, y, h = 90, led = false }: { x: number; y: number; h?: number; led?: boolean }) {
  const w = h * 0.16;
  const top = y - h;
  return (
    <g strokeWidth={1}>
      <path d={`M${x - w} ${y}L${x} ${top}L${x + w} ${y}`} strokeWidth={1.25} />
      {[0.25, 0.5, 0.72].map((k) => {
        const yy = y - h * k;
        const ww = w * (1 - k);
        return <path key={k} d={`M${x - ww} ${yy}H${x + ww}`} />;
      })}
      <path d={`M${x - w} ${y}L${x + w * 0.75} ${y - h * 0.25}L${x - w * 0.5} ${y - h * 0.5}L${x + w * 0.28} ${y - h * 0.72}`} opacity={0.6} />
      <path d={`M${x - 7} ${top + 4}v12M${x + 7} ${top + 4}v12`} strokeWidth={2} />
      {led && <circle cx={x} cy={top - 4} r={2} className="led-blink" fill="var(--live)" stroke="none" />}
    </g>
  );
}

export { SyxteeLogo as SLogo } from "@/components/illustrations/iso";
