"use client";

import { useEffect, useState } from "react";

// Fin de titre qui change en douceur : toutes les phrases sont empilées dans la même cellule (la largeur et la hauteur ne bougent pas),
// la phrase active monte en fondu, la précédente part vers le haut en se floutant. Sous prefers-reduced-motion : première phrase fixe.
const HOLD_MS = 3200;

export default function RotatingWords({ items }: { items: string[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % items.length), HOLD_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  return (
    <span className="grid justify-items-center">
      {items.map((t, k) => (
        <em
          key={t}
          aria-hidden={k !== i}
          className="col-start-1 row-start-1 transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={k === i ? { opacity: 1, transform: "none", filter: "none" } : { opacity: 0, transform: `translateY(${k === (i + items.length - 1) % items.length ? "-0.35em" : "0.35em"})`, filter: "blur(8px)" }}
        >
          {t}
        </em>
      ))}
    </span>
  );
}
