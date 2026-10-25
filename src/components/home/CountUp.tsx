"use client";

import { useEffect, useRef, useState } from "react";

// Compteur qui monte de 0 à `to` quand il entre à l'écran (une seule fois). Le chiffre final est déjà dans le HTML :
// sans JavaScript ou sous prefers-reduced-motion, il reste affiché tel quel.
export default function CountUp({ to, ms = 1600 }: { to: number; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / ms);
        setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    // Le compteur repart de 0 seulement quand il est hors écran : pas de saut visible.
    setN(0);
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, ms]);

  return <span ref={ref}>{n.toLocaleString("fr-FR")}</span>;
}
