"use client";

import { useEffect, useRef } from "react";

// Curseur du site : un point qui remplace le curseur de la souris sur les pages du site (pas le dashboard, l'admin ni la connexion).
// Il grossit en cercle au-dessus des liens et des boutons, rétrécit au clic. Position pilotée hors React (transform direct, pas de state).
// N'existe que pour une souris fine (pas de tactile) ; sous « mouvement réduit » il suit sans retard. Le curseur du système reste sur les champs de saisie.
const INTERACTIVE = 'a, button, [role="button"], [role="tab"], summary, label[for], input[type="submit"], input[type="checkbox"], input[type="radio"], select';

export default function SiteCursor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.documentElement.classList.add("has-site-cursor");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let x = -100, y = -100, cx = x, cy = y, raf = 0, shown = false;
    const draw = () => {
      cx += (x - cx) * (reduce ? 1 : 0.28);
      cy += (y - cy) * (reduce ? 1 : 0.28);
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.1 ? requestAnimationFrame(draw) : 0;
    };
    const stateOf = (e: Event) => ((e.target instanceof Element ? e.target : null)?.closest(INTERACTIVE) ? "link" : "dot");
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; cx = x; cy = y; el.dataset.on = "true"; }
      el.dataset.state = stateOf(e);
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const down = (e: PointerEvent) => { el.dataset.down = "true"; el.dataset.state = stateOf(e) === "link" ? "link" : "down"; };
    const up = (e: PointerEvent) => { delete el.dataset.down; el.dataset.state = stateOf(e); };
    const leave = () => { shown = false; delete el.dataset.on; };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", down, { passive: true });
    document.addEventListener("pointerup", up, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-site-cursor");
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("mouseleave", leave);
    };
  }, []);
  return <div ref={ref} className="site-cursor" aria-hidden="true" data-state="dot" />;
}
