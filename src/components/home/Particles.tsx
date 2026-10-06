"use client";

import { useEffect, useRef } from "react";

// Petits « + » et particules qui flottent et scintillent par-dessus le fond en volutes.
// Canvas 2D, un seul requestAnimationFrame, en pause hors écran et onglet caché ; figé en prefers-reduced-motion.
// Couleur lue sur --foreground : marche en thème sombre et clair.

type P = { x: number; y: number; vx: number; vy: number; r: number; plus: boolean; ph: number; sp: number };

export default function Particles({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, visible = true, ps: P[] = [];
    let ink = "255,255,255";

    const readInk = () => {
      const m = getComputedStyle(cv).color.match(/\d+/g);
      if (m) ink = `${m[0]},${m[1]},${m[2]}`;
    };
    const seed = () => {
      const n = Math.round(Math.min(90, (w * h) / 16000) * density);
      ps = Array.from({ length: n }, () => {
        const plus = Math.random() < 0.22;
        return {
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.12, vy: -0.04 - Math.random() * 0.14,
          r: plus ? 3 + Math.random() * 3 : 0.6 + Math.random() * 1.4,
          plus, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.2,
        };
      });
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        ctx.globalAlpha = 0.12 + 0.5 * (0.5 + 0.5 * Math.sin(p.ph + t * 0.001 * p.sp));
        ctx.strokeStyle = ctx.fillStyle = `rgb(${ink})`;
        if (p.plus) {
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - p.r, p.y); ctx.lineTo(p.x + p.r, p.y);
          ctx.moveTo(p.x, p.y - p.r); ctx.lineTo(p.x, p.y + p.r);
          ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        }
      }
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readInk(); seed(); draw(0);
    };
    const tick = (t: number) => {
      if (visible && !document.hidden) {
        for (const p of ps) {
          p.x += p.vx; p.y += p.vy;
          if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
          if (p.x < -8) p.x = w + 8; else if (p.x > w + 8) p.x = -8;
        }
        draw(t);
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    const mo = new MutationObserver(readInk);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect(); };
  }, [density]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full text-foreground" />;
}
