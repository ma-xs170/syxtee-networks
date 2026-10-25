import type { CSSProperties } from "react";

// Halo de fond d'une section : courbe douce (plusieurs paliers), bord bas estompé et léger grain par-dessus.
// Le grain casse les « bandes » (artefacts) qu'un dégradé très sombre dessine en 8 bits sur certains écrans.
// Les halos alternent gauche/droite d'une section à l'autre : jamais deux couleurs côte à côte au raccord.
export const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function glow(color: string, at: string, w: number, h: number, a: number): CSSProperties {
  const c = (n: number) => `color-mix(in srgb, ${color} ${(a * n).toFixed(1)}%, transparent)`;
  const mask = "linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)";
  return {
    background: `${GRAIN}, radial-gradient(${w}% ${h}% at ${at}, ${c(1)} 0%, ${c(0.72)} 25%, ${c(0.4)} 48%, ${c(0.15)} 70%, ${c(0.04)} 88%, transparent 100%)`,
    maskImage: mask,
    WebkitMaskImage: mask,
  };
}
