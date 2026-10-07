"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

// Fin du titre du hero : la phrase sur fond rouge change toute seule, dans un ordre qui raconte le produit (le prix, la
// fiabilité, le réseau, le monde). Le fond s'élargit en douceur à la largeur de chaque phrase, les mots entrent et sortent
// en flou. Se met en pause au survol et au focus. En mouvement réduit : première phrase, fixe, pour tout le monde
// y compris les lecteurs d'écran (les autres phrases sont masquées à l'accessibilité).

const PHRASES = ["Sans jamais couper.", "Avec ton téléphone.", "Sans matériel coûteux.", "Piloté à distance."];
const EVERY = 3200;

export default function RotatingHighlight() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [widths, setWidths] = useState<number[]>([]);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const measure = () => setWidths(refs.current.map((r) => r?.offsetWidth ?? 0));
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (reduce || paused) return;
    const t = setTimeout(() => setI((n) => (n + 1) % PHRASES.length), EVERY);
    return () => clearTimeout(t);
  }, [i, paused, reduce]);

  const w = widths[i];

  return (
    <span
      className="inline-grid max-w-full overflow-hidden rounded-[2px] bg-accent px-1 align-baseline text-on-accent transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
      style={w ? { width: w + 8 } : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {PHRASES.map((p, n) => (
        <span
          key={p}
          ref={(el) => {
            refs.current[n] = el;
          }}
          aria-hidden={n !== 0}
          className={`col-start-1 row-start-1 justify-self-start whitespace-nowrap transition-[opacity,filter,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            n === i ? "translate-y-0 opacity-100 blur-0" : n === (i + PHRASES.length - 1) % PHRASES.length ? "-translate-y-3 opacity-0 blur-[6px]" : "translate-y-3 opacity-0 blur-[6px]"
          }`}
        >
          {p}
        </span>
      ))}
    </span>
  );
}
