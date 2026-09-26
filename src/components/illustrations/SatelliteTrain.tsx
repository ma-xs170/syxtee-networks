"use client";

import { useId } from "react";

// Satellites filaires : le satellite seul (SVG) et les trains de satellites en orbite (canvas).

/** Satellite vu de face : corps, 2 panneaux solaires, LED « live », halo. Centré sur (0, 0). */
export function SatelliteGlyph() {
  const id = useId();
  return (
    <>
      <defs>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={26} fill={`url(#${id}glow)`} />
      <g className="svg-hairline" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
        <rect x={-6} y={-5} width={12} height={10} rx={1.5} fill="currentColor" fillOpacity={0.08} />
        <rect x={-32} y={-4} width={22} height={8} strokeWidth={1} />
        <rect x={10} y={-4} width={22} height={8} strokeWidth={1} />
        <path d="M-10 0H-6M6 0H10M-25 -4V4M-18 -4V4M17 -4V4M24 -4V4" strokeWidth={1} />
        <circle cx={0} cy={0} r={1.5} className="led-blink" fill="var(--live)" stroke="none" />
      </g>
    </>
  );
}

// Arcs d'orbite (Bézier quadratiques en coordonnées normalisées) et leurs trains de satellites.
const orbits = [
  { y0: 0.5, yc: 0.02, y1: 0.42, speed: 0.045, offset: 0 },
  { y0: 0.78, yc: 0.2, y1: 0.66, speed: 0.035, offset: 0.55 },
  { y0: 0.3, yc: -0.12, y1: 0.24, speed: 0.055, offset: 0.25 },
  { y0: 0.95, yc: 0.42, y1: 0.9, speed: 0.03, offset: 0.8 },
];
const TRAIN = 7;
const SPACING = 0.016;

/** Dessine les orbites en pointillés et les trains de satellites qui les parcourent, de gauche à droite. */
export function drawSatelliteTrains(
  ctx: CanvasRenderingContext2D,
  { w, h, time, alpha, dy }: { w: number; h: number; time: number; alpha: number; dy: number },
) {
  const point = (o: (typeof orbits)[number], t: number) => {
    const x0 = -0.1 * w, x1 = 1.1 * w, xc = 0.5 * w;
    const y0 = o.y0 * h + dy, y1 = o.y1 * h + dy, yc = o.yc * h + dy;
    const u = 1 - t;
    return [u * u * x0 + 2 * u * t * xc + t * t * x1, u * u * y0 + 2 * u * t * yc + t * t * y1] as const;
  };

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

    // Train de satellites avec traînée
    const head = ((time * o.speed + o.offset) % 1.35) - 0.15;
    for (let k = 0; k < TRAIN; k++) {
      const t = head - k * SPACING;
      if (t < 0 || t > 1) continue;
      const [x, y] = point(o, t);
      const [tx, ty] = point(o, Math.max(0, t - 0.025));
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
}
