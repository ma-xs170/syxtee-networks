"use client";

import { useEffect, useRef } from "react";

// Fond de l'appel final : un dégradé qui tourne lentement, des points qui scintillent et un globe de points qui pivote sous le titre.
// Canvas 2D (aucune bibliothèque), en pause hors écran et onglet caché, image fixe si l'utilisateur réduit les animations.

const STARS = Array.from({ length: 22 }, (_, i) => ({
  x: ((i * 37 + 11) % 97) + 1,
  y: ((i * 53 + 7) % 61) + 4,
  r: 2 + (i % 3),
  d: (i * 0.7) % 6,
}));

/** Points répartis sur une sphère (spirale de Fibonacci) ; un bruit de basse fréquence garde des « continents » plus denses. */
function sphere(n: number) {
  const pts: { lat: number; lon: number; w: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const lat = Math.asin(y);
    const lon = (i * golden) % (Math.PI * 2);
    const w = 0.5 + 0.5 * Math.sin(lon * 2.3 + Math.sin(lat * 3.1) * 2) * Math.cos(lat * 2.1 + lon * 0.8);
    pts.push({ lat, lon, w });
  }
  return pts.filter((p) => p.w > 0.38);
}

// `cap` : calotte en bas de section (appel final). `full` : globe entier derrière le contenu (héros), points plus discrets pour garder le texte lisible.
export default function CtaGlobe({ variant = "cap" }: { variant?: "cap" | "full" | "hero" }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx) return;
    const pts = sphere(2600);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    let angle = 0.6;
    let last = 0;
    let w = 0;
    let h = 0;
    const ink = () => getComputedStyle(el).color;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv!.clientWidth;
      h = cv!.clientHeight;
      cv!.width = Math.round(w * dpr);
      cv!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      const full = variant === "full";
      const hero = variant === "hero";
      const R = full ? Math.min(w * 0.42, h * 0.78, 560) : hero ? Math.min(w * 0.24, 380) : Math.min(w * 0.3, 520);
      const cap = hero ? Math.min(h * 0.2, 140) : Math.min(h * 0.3, 260); // hauteur visible de la calotte, sous le contenu
      const cx = w / 2;
      const cy = full ? h * 0.52 : h - cap + R; // centre sous le bord bas : on ne voit que la calotte
      const dim = full ? 0.3 : 1;
      ctx!.fillStyle = ink();
      // Halo et trait lumineux du bord.
      ctx!.save();
      ctx!.strokeStyle = ink();
      ctx!.lineWidth = 1.5;
      ctx!.shadowColor = ink();
      ctx!.shadowBlur = 28;
      ctx!.globalAlpha = 0.6 * dim;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, full ? 0 : Math.PI * 1.1, full ? Math.PI * 2 : Math.PI * 1.9);
      ctx!.stroke();
      ctx!.restore();
      const tilt = 0.38;
      for (const p of pts) {
        const lon = p.lon + angle;
        const x = Math.cos(p.lat) * Math.sin(lon);
        const y0 = Math.sin(p.lat);
        const z0 = Math.cos(p.lat) * Math.cos(lon);
        const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
        const z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
        if (z <= 0) continue;
        const px = cx + x * R;
        const py = cy - y * R;
        if (py < 0 || py > h + 4) continue;
        ctx!.globalAlpha = Math.min(0.75, z * 0.8) * (0.45 + 0.55 * p.w) * dim;
        ctx!.fillRect(px, py, 1.6, 1.6);
      }
      ctx!.globalAlpha = 1;
    }

    function frame(t: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      if (t - last < 33) return; // 30 images par seconde suffisent pour une rotation lente
      angle += ((t - last) / 1000) * 0.14;
      last = t;
      draw();
    }

    resize();
    draw();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    if (!reduce) raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [variant]);

  return (
    <div ref={box} aria-hidden="true" className="cta-globe pointer-events-none absolute inset-0 overflow-hidden text-foreground">
      <div className="cta-globe-sky absolute inset-0" />
      {STARS.map((s, i) => (
        <span key={i} className="cta-star absolute rounded-full bg-foreground/60" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r, height: s.r, animationDelay: `${s.d}s` }} />
      ))}
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
