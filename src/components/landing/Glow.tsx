"use client";

import { useEffect } from "react";

/** Halo qui suit le curseur sur les cartes : un seul écouteur délégué, il écrit --mx et --my sur la carte survolée (pas de re-render). */
export default function Glow() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const icons = () => {
      raf = 0;
      document.querySelectorAll<HTMLElement>(".glass-tile").forEach((el) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--gx", `${((last.x - r.left) / r.width) * 100}%`);
        el.style.setProperty("--gy", `${((last.y - r.top) / r.height) * 100}%`);
      });
    };
    const last = { x: 0, y: 0 };
    const on = (e: PointerEvent) => {
      last.x = e.clientX;
      last.y = e.clientY;
      if (!raf) raf = requestAnimationFrame(icons);
      const card = (e.target as Element | null)?.closest?.<HTMLElement>(".card, .bento-cell");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", on, { passive: true });
    return () => {
      document.removeEventListener("pointermove", on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
