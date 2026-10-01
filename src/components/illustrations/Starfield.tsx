"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import { useStoryActive } from "@/components/story/StoryContext";
import { drawSatelliteTrains } from "./SatelliteTrain";

// Ciel étoilé en canvas, avec trains de satellites en option.
// Une seule boucle requestAnimationFrame. Dans un ScrollStory, elle suit la visibilité du bloc sticky
// (gérée par le moteur) ; ailleurs, le canvas observe lui-même s'il est à l'écran.
// animate={false} : une seule image, sans boucle (prefers-reduced-motion).

const STARS = 300;

// Générateur pseudo-aléatoire déterministe (même ciel à chaque visite).
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(550);
const stars = Array.from({ length: STARS }, () => ({
  x: rand(),
  y: rand() * 1.1 - 0.1,
  r: 0.4 + rand() ** 3 * 1.3,
  a: 0.25 + rand() * 0.7,
  z: 0.4 + rand() * 0.6, // profondeur : les étoiles proches bougent plus
  sp: 0.6 + rand() * 1.8,
  ph: rand() * Math.PI * 2,
}));

/** Opacité du ciel, dérive verticale (parallaxe) et sortie vers le haut, selon le progrès et la hauteur. */
export type SkyState = (v: number, h: number) => { alpha: number; drift: number; exit: number };
const alwaysOn: SkyState = () => ({ alpha: 1, drift: 0, exit: 0 });

export default function Starfield({
  p,
  state = alwaysOn,
  trains = true,
  animate = true,
  className = "",
}: {
  p: MotionValue<number>;
  state?: SkyState;
  trains?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const controls = useRef<{ start: () => void; stop: () => void } | null>(null);
  const active = useStoryActive();
  const managed = active !== null;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;
    let cleared = false;

    const draw = (time: number) => {
      const { alpha, drift, exit } = state(p.get(), h);
      if (alpha <= 0.001) {
        if (!cleared) ctx.clearRect(0, 0, w, h);
        cleared = true;
        return;
      }
      cleared = false;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim() || "#fff";

      for (const s of stars) {
        const y = s.y * h + drift * s.z - exit;
        if (y < -2 || y > h + 2) continue;
        ctx.globalAlpha = alpha * s.a * (0.7 + 0.3 * Math.sin(time * s.sp + s.ph));
        ctx.fillRect(s.x * w - s.r, y - s.r, s.r * 2, s.r * 2);
      }

      if (trains) drawSatelliteTrains(ctx, { w, h, time, alpha, dy: drift * 0.8 - exit });
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cleared = false;
      draw(performance.now() / 1000);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      draw(now / 1000);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    controls.current = animate ? { start, stop } : null;

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = animate && !managed ? new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())) : null;
    io?.observe(canvas);

    return () => {
      stop();
      controls.current = null;
      ro.disconnect();
      io?.disconnect();
    };
  }, [p, state, trains, animate, managed]);

  // Pause / reprise pilotées par le ScrollStory.
  useEffect(() => {
    if (!managed) return;
    if (active) controls.current?.start();
    else controls.current?.stop();
  }, [active, managed]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
