"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { ramp } from "@/components/story/timeline";

// Scène 2 de l'accueil : carte filaire en points (halftone) de la Caraïbe et de la côte Est des USA.
// 3 fins arcs parallèles (4G, 5G, Wi-Fi) de la Guadeloupe vers New York, avec des paquets qui voyagent dessus.
// Projection simple (équirectangulaire) dans le repère 600 × 600 : 15 px par degré.

type LonLat = readonly [number, number];
export const project = ([lon, lat]: LonLat) => [40 + (lon + 90) * 15, 40 + (44 - lat) * 15] as const;

export const GUADELOUPE = project([-61.55, 16.25]);
export const NEW_YORK = project([-74, 40.7]);

// Contours simplifiés (lon, lat).
const LAND: LonLat[][] = [
  // Côte Est des USA, de New York au golfe du Mexique
  [
    [-73.8, 40.6], [-74.1, 39.6], [-75.1, 38.8], [-75.9, 37.2], [-75.6, 35.5], [-76.8, 34.6], [-78.5, 33.8], [-80, 32.6],
    [-81.2, 31.3], [-81.3, 29.6], [-80.6, 28.1], [-80.1, 26.6], [-80.3, 25.3], [-81.1, 25.2], [-81.8, 26.4], [-82.6, 27.9],
    [-82.8, 29.1], [-84, 30], [-85.4, 29.7], [-87, 30.4], [-89.4, 30.2], [-90, 29.2], [-91, 29], [-91, 45], [-70.5, 45],
    [-70.6, 43.1], [-70.9, 42.3], [-70, 41.8], [-71.4, 41.4], [-72.9, 41.1],
  ],
  // Cuba
  [
    [-84.9, 21.9], [-83.2, 22.9], [-81.6, 23.2], [-80, 22.9], [-78.3, 22.3], [-77.2, 21.6], [-75.6, 21], [-74.2, 20.3],
    [-74.8, 19.9], [-77.6, 19.9], [-77.8, 20.7], [-78.6, 21.5], [-80.5, 21.9], [-82, 22.2], [-83.5, 22], [-84.4, 21.6],
  ],
  // Hispaniola
  [
    [-74.4, 19.9], [-72.8, 19.9], [-71.2, 19.9], [-69.8, 19.4], [-68.4, 18.7], [-68.8, 18.2], [-70, 18.2], [-71.4, 17.7],
    [-72, 18.2], [-73.4, 18.2], [-74.4, 18.4], [-73, 18.9],
  ],
  // Jamaïque
  [[-78.3, 18.5], [-77.2, 18.5], [-76.2, 18.1], [-76.8, 17.8], [-77.8, 17.9]],
  // Porto Rico
  [[-67.2, 18.5], [-65.6, 18.4], [-65.7, 18], [-67.2, 17.9]],
  // Côte du Venezuela
  [
    [-73, 11.3], [-71.8, 12.4], [-71.2, 11.6], [-70.2, 11.6], [-69.8, 12.3], [-68.3, 10.9], [-66.2, 10.6], [-64.3, 10.6],
    [-63.1, 10.7], [-61.9, 10.8], [-61, 10], [-60, 8.4], [-73, 8.4],
  ],
];

// Petites Antilles et Bahamas : trop petites pour la trame, dessinées en points.
const ISLANDS: LonLat[] = [
  [-62.7, 17.3], [-61.8, 17.1], [-61.35, 15.4], [-61, 14.65], [-60.97, 13.9], [-61.2, 13.25], [-59.55, 13.15], [-61.7, 12.1],
  [-63.05, 18.05], [-64.8, 18.35], [-77.4, 25.05], [-76.6, 24.4], [-75.9, 23.6], [-74.9, 23.2], [-73.7, 21.5], [-78, 26.6],
  [-72.3, 21.8],
];

function inside([x, y]: readonly [number, number], poly: (readonly [number, number])[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// Trame de points calculée une fois : un point tous les 9 px, gardé s'il tombe sur une terre.
const polys = LAND.map((p) => p.map(project));
const STEP = 9;
const dots: string[] = [];
for (let y = 20; y <= 600; y += STEP) {
  for (let x = 20 + ((y / STEP) % 2) * (STEP / 2); x <= 600; x += STEP) {
    if (polys.some((p) => inside([x, y], p))) dots.push(`M${x} ${y}h0`);
  }
}
const DOTS = dots.join("");
const ISLAND_DOTS = ISLANDS.map(project)
  .map(([x, y]) => `M${x.toFixed(1)} ${y.toFixed(1)}h0`)
  .join("");

// Les 3 arcs : même courbe, décalée perpendiculairement.
const [gx, gy] = GUADELOUPE;
const [nx, ny] = NEW_YORK;
const len = Math.hypot(nx - gx, ny - gy);
const perp = [-(ny - gy) / len, (nx - gx) / len] as const; // vers l'Atlantique (à droite du trajet)
const ctrl = [(gx + nx) / 2 + perp[0] * 130, (gy + ny) / 2 + perp[1] * 130] as const;

export const LINKS = [
  { label: "4G", offset: -7, speed: 0.16, weak: true },
  { label: "5G", offset: 0, speed: 0.26, weak: false },
  { label: "WI-FI", offset: 7, speed: 0.21, weak: false },
].map((l) => {
  const o = (k: number) => [perp[0] * l.offset * k, perp[1] * l.offset * k] as const;
  const a = [gx + o(1)[0], gy + o(1)[1]] as const;
  const c = [ctrl[0] + o(2)[0], ctrl[1] + o(2)[1]] as const;
  const b = [nx + o(1)[0], ny + o(1)[1]] as const;
  const at = (t: number) => {
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as const;
  };
  return { ...l, d: `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${c[0].toFixed(1)} ${c[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`, at, start: a };
});

const PACKETS = 3;

function Packet({ link, i, time, weak }: { link: (typeof LINKS)[number]; i: number; time: MotionValue<number>; weak: MotionValue<number> }) {
  // Sur la connexion qui faiblit, les paquets ralentissent et s'éteignent.
  const t = useTransform([time, weak], ([s, w]: number[]) => (s * link.speed * (link.weak ? 1 - 0.7 * w : 1) + i / PACKETS) % 1);
  const x = useTransform(t, (u) => link.at(u)[0] - 2.5);
  const y = useTransform(t, (u) => link.at(u)[1] - 2.5);
  const opacity = useTransform([t, weak], ([u, w]: number[]) => Math.min(ramp(u, 0, 0.08), 1 - ramp(u, 0.92, 1)) * (link.weak ? 1 - 0.75 * w : 1));
  return <motion.rect x={x} y={y} width={5} height={5} rx={1} fill="#fff" stroke="none" style={{ opacity }} />;
}

function MapLink({ link, draw, weak, time }: { link: (typeof LINKS)[number]; draw: MotionValue<number>; weak: MotionValue<number>; time: MotionValue<number> }) {
  const strokeOpacity = useTransform(weak, (w) => (link.weak ? 0.7 - 0.5 * w : 0.7));
  const lost = useTransform(weak, (w) => (link.weak ? w : 0));
  const [lx, ly] = link.start;
  return (
    <g>
      <motion.path d={link.d} strokeWidth={1} style={{ pathLength: draw, strokeOpacity }} />
      {link.weak && <motion.path d={link.d} strokeWidth={1} strokeDasharray="2 5" style={{ opacity: lost }} />}
      <motion.g style={{ opacity: draw }}>
        {Array.from({ length: PACKETS }, (_, i) => (
          <Packet key={i} link={link} i={i} time={time} weak={weak} />
        ))}
      </motion.g>
      <motion.text
        x={lx + 14 + link.offset * 4.5}
        y={ly - 10 - link.offset * 2}
        fill="var(--foreground)"
        stroke="none"
        className="font-mono text-[14px] lg:text-[11px]"
        style={{ opacity: draw }}
      >
        {link.label}
      </motion.text>
    </g>
  );
}

/**
 * `draw` (0 → 1) trace les arcs, `weak` (0 → 1) fait faiblir la 4G, `time` (secondes) fait voyager les paquets.
 */
export default function CaribbeanMap({ draw, weak, time }: { draw: MotionValue<number>; weak: MotionValue<number>; time: MotionValue<number> }) {
  const lostO = useTransform(weak, (w) => ramp(w, 0.3, 0.8));
  return (
    <g className="svg-hairline" stroke="currentColor" strokeLinecap="round" fill="none">
      {/* Trame des terres */}
      <path d={DOTS} strokeWidth={2.2} strokeOpacity={0.32} />
      <path d={ISLAND_DOTS} strokeWidth={3} strokeOpacity={0.55} />
      {/* Méridiens et parallèles en pointillés */}
      <path d="M40 40V580M190 40V580M340 40V580M490 40V580M20 115H600M20 265H600M20 415H600" strokeWidth={1} strokeOpacity={0.07} strokeDasharray="1 6" />

      {LINKS.map((l) => (
        <MapLink key={l.label} link={l} draw={draw} weak={weak} time={time} />
      ))}

      {/* Villes */}
      <g strokeWidth={1}>
        <circle cx={gx} cy={gy} r={4} fill="#fff" stroke="none" />
        <circle cx={gx} cy={gy} r={10} strokeOpacity={0.5} className="wave-out" style={{ transformOrigin: `${gx}px ${gy}px` }} />
        <text x={gx - 12} y={gy + 26} textAnchor="middle" fill="var(--foreground)" stroke="none" className="font-mono text-[14px] lg:text-[11px]">
          GUADELOUPE
        </text>
        <circle cx={nx} cy={ny} r={4} fill="#fff" stroke="none" />
        <circle cx={nx} cy={ny} r={3} fill="var(--live)" stroke="none" className="led-blink" />
        <text x={nx + 12} y={ny - 10} fill="var(--foreground)" stroke="none" className="font-mono text-[14px] lg:text-[11px]">
          NEW YORK · RELAIS
        </text>
      </g>

      {/* La 4G faiblit : les deux autres continuent */}
      <motion.text x={gx - 150} y={gy - 60} fill="var(--muted)" stroke="none" className="font-mono text-[14px] lg:text-[11px]" style={{ opacity: lostO }}>
        4G FAIBLE → 5G + WI-FI
      </motion.text>
    </g>
  );
}
