"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import { ramp } from "./timeline";

// Ciel étoilé + trains de satellites en canvas (scène 2).
// Une seule boucle requestAnimationFrame, arrêtée quand le canvas sort de l'écran.
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

// Arcs d'orbite (Bézier quadratiques en coordonnées normalisées) et leurs trains de satellites.
const orbits = [
  { y0: 0.5, yc: 0.02, y1: 0.42, speed: 0.045, offset: 0 },
  { y0: 0.78, yc: 0.2, y1: 0.66, speed: 0.035, offset: 0.55 },
  { y0: 0.3, yc: -0.12, y1: 0.24, speed: 0.055, offset: 0.25 },
  { y0: 0.95, yc: 0.42, y1: 0.9, speed: 0.03, offset: 0.8 },
];
const TRAIN = 7;
const SPACING = 0.016;

// Opacité du ciel et décalage vertical (caméra qui monte, puis redescend) selon le progrès.
export function skyState(v: number, h: number) {
  return {
    alpha: ramp(v, 0.3, 0.37) * (1 - ramp(v, 0.7, 0.76)),
    drift: ramp(v, 0.33, 0.6) * 70,
    exit: ramp(v, 0.6, 0.72) * h * 1.25,
  };
}

export default function Starfield({
  p,
  animate = true,
  className = "",
}: {
  p: MotionValue<number>;
  animate?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;
    let cleared = false;

    const point = (o: (typeof orbits)[number], t: number, dy: number) => {
      const x0 = -0.1 * w, x1 = 1.1 * w, xc = 0.5 * w;
      const y0 = o.y0 * h + dy, y1 = o.y1 * h + dy, yc = o.yc * h + dy;
      const u = 1 - t;
      return [u * u * x0 + 2 * u * t * xc + t * t * x1, u * u * y0 + 2 * u * t * yc + t * t * y1] as const;
    };

    const draw = (time: number) => {
      const { alpha, drift, exit } = skyState(p.get(), h);
      if (alpha <= 0.001) {
        if (!cleared) ctx.clearRect(0, 0, w, h);
        cleared = true;
        return;
      }
      cleared = false;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#fff";

      for (const s of stars) {
        const y = s.y * h + drift * s.z - exit;
        if (y < -2 || y > h + 2) continue;
        ctx.globalAlpha = alpha * s.a * (0.7 + 0.3 * Math.sin(time * s.sp + s.ph));
        ctx.fillRect(s.x * w - s.r, y - s.r, s.r * 2, s.r * 2);
      }

      const dy = drift * 0.8 - exit;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#fff";
      for (const o of orbits) {
        // Orbite en pointillés très fins
        ctx.globalAlpha = alpha * 0.14;
        ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.moveTo(-0.1 * w, o.y0 * h + dy);
        ctx.quadraticCurveTo(0.5 * w, o.yc * h + dy, 1.1 * w, o.y1 * h + dy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Train de satellites avec traînée, de gauche à droite
        const head = ((time * o.speed + o.offset) % 1.35) - 0.15;
        for (let k = 0; k < TRAIN; k++) {
          const t = head - k * SPACING;
          if (t < 0 || t > 1) continue;
          const [x, y] = point(o, t, dy);
          const [tx, ty] = point(o, Math.max(0, t - 0.025), dy);
          const g = ctx.createLinearGradient(tx, ty, x, y);
          g.addColorStop(0, "rgba(255,255,255,0)");
          g.addColorStop(1, "rgba(255,255,255,0.55)");
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = g;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.globalAlpha = alpha * 0.95;
          ctx.fillRect(x - 1.1, y - 1.1, 2.2, 2.2);
        }
        ctx.strokeStyle = "#fff";
      }
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

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = animate ? new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())) : null;
    io?.observe(canvas);

    return () => {
      stop();
      ro.disconnect();
      io?.disconnect();
    };
  }, [p, animate]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
