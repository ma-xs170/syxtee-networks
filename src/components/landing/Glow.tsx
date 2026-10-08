"use client";

import { useEffect } from "react";

/** Halo qui suit le curseur sur les cartes : un seul écouteur délégué, il écrit --mx et --my sur la carte survolée (pas de re-render). */
export default function Glow() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const on = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest?.<HTMLElement>(".card, .bento-cell");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", on, { passive: true });
    return () => document.removeEventListener("pointermove", on);
  }, []);
  return null;
}
