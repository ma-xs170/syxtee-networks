import type { ReactNode } from "react";

// Base commune des illustrations filaires : perspective isométrique 3/4, trait constant, animations CSS.
// Repère : x vers la droite-bas, y vers la gauche-bas, z vers le haut.

const C = Math.cos(Math.PI / 6);
const S = 0.5;
const f = (n: number) => Number(n.toFixed(2));

export function iso(x: number, y: number, z: number): [number, number] {
  return [f((x - y) * C), f((x + y) * S - z)];
}

/** Chemin fermé passant par des points 3D. */
export function isoPath(points: [number, number, number][], closed = true) {
  return points.map((p, i) => `${i ? "L" : "M"}${iso(...p).join(" ")}`).join("") + (closed ? "Z" : "");
}

// Matrices qui plaquent un dessin 2D sur les faces visibles d'une boîte.
// Dessus : (u le long de x, v le long de y). Face avant (+y) : (u le long de x, -t vers le haut).
// Flanc (+x) : (u le long de -y, -t vers le haut).
export function faces(x: number, y: number, z: number, w: number, d: number, h: number) {
  const m = (o: [number, number], a: [number, number], b: [number, number]) =>
    `matrix(${f(a[0])} ${f(a[1])} ${f(b[0])} ${f(b[1])} ${o[0]} ${o[1]})`;
  return {
    top: m(iso(x, y, z + h), [C, S], [-C, S]),
    front: m(iso(x, y + d, z), [C, S], [0, 1]),
    side: m(iso(x + w, y + d, z), [C, -S], [0, 1]),
  };
}

type BoxProps = {
  at: [number, number, number];
  size: [number, number, number];
  r?: number;
  top?: ReactNode;
  front?: ReactNode;
  side?: ReactNode;
  fill?: boolean;
};

/** Boîte filaire (faces visibles) avec un léger volume ; `top`, `front`, `side` se dessinent dans le plan de chaque face. */
export function IsoBox({ at, size, r = 0, top, front, side, fill = true }: BoxProps) {
  const [w, d, h] = size;
  const m = faces(...at, w, d, h);
  return (
    <g>
      <g transform={m.side}>
        <rect x={0} y={-h} width={d} height={h} rx={r} fill="currentColor" fillOpacity={fill ? 0.03 : 0} />
        {side}
      </g>
      <g transform={m.front}>
        <rect x={0} y={-h} width={w} height={h} rx={r} fill="currentColor" fillOpacity={fill ? 0.05 : 0} />
        {front}
      </g>
      <g transform={m.top}>
        <rect x={0} y={0} width={w} height={d} rx={r} fill="currentColor" fillOpacity={fill ? 0.07 : 0} />
        {top}
      </g>
    </g>
  );
}

/** Ombre au sol : losange isométrique très léger. */
export function IsoShadow({ at, size }: { at: [number, number, number]; size: [number, number] }) {
  const [x, y, z] = at;
  const [w, d] = size;
  return (
    <path
      d={isoPath([
        [x, y, z],
        [x + w, y, z],
        [x + w, y + d, z],
        [x, y + d, z],
      ])}
      fill="currentColor"
      fillOpacity={0.04}
      strokeOpacity={0.25}
      strokeDasharray="2 5"
    />
  );
}

/** Câble qui ondule de a à b (points 2D déjà projetés). */
export function wavy(a: [number, number], b: [number, number], waves = 3, amp = 6) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [-dy / len, dx / len];
  let d = `M${f(a[0])} ${f(a[1])}`;
  const n = waves * 2;
  for (let i = 1; i <= n; i++) {
    const t0 = (i - 0.5) / n;
    const t1 = i / n;
    const k = (i % 2 ? 1 : -1) * amp;
    d += `Q${f(a[0] + dx * t0 + nx * k)} ${f(a[1] + dy * t0 + ny * k)} ${f(a[0] + dx * t1)} ${f(a[1] + dy * t1)}`;
  }
  return d;
}

/** Vis : un cercle et sa fente. */
export function Screw({ x, y, r = 2 }: { x: number; y: number; r?: number }) {
  return (
    <g strokeWidth={1}>
      <circle cx={x} cy={y} r={r} />
      <path d={`M${x - r * 0.6} ${y}H${x + r * 0.6}`} />
    </g>
  );
}

/** LED d'activité rouge (clignote si l'illustration est animée). */
export function Led({ x, y, r = 2, delay = 0 }: { x: number; y: number; r?: number; delay?: number }) {
  return (
    <circle cx={x} cy={y} r={r} className="led-blink" style={{ animationDelay: `${delay}s` }} fill="var(--live)" stroke="none" />
  );
}

/** Texte mono des illustrations. */
export function Label({ x, y, children, anchor = "start", size = 10, strong = false }: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  size?: number;
  strong?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={size}
      stroke="none"
      fill={strong ? "var(--foreground)" : "var(--muted)"}
      className="font-mono"
      letterSpacing="0.05em"
    >
      {children}
    </text>
  );
}

/** Ondes en pointillés qui partent de (cx, cy) vers `angle` (degrés, 0 = droite, -90 = haut). */
export function Waves({ cx, cy, angle, radii, spread = 22, delay = 0 }: {
  cx: number;
  cy: number;
  angle: number;
  radii: number[];
  spread?: number;
  delay?: number;
}) {
  const arc = (r: number) => {
    const a0 = ((angle - spread) * Math.PI) / 180;
    const a1 = ((angle + spread) * Math.PI) / 180;
    return `M${f(cx + r * Math.cos(a0))} ${f(cy + r * Math.sin(a0))}A${r} ${r} 0 0 1 ${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))}`;
  };
  return (
    <g strokeDasharray="2 4">
      {radii.map((r, i) => (
        <path
          key={r}
          d={arc(r)}
          className="wave-out"
          style={{ transformOrigin: `${cx}px ${cy}px`, animationDelay: `${delay + i * 0.8}s` }}
        />
      ))}
    </g>
  );
}

/** Enveloppe SVG commune : trait currentColor 1,25 px constant, bouts ronds, `animated={false}` fige tout. */
export function Illustration({
  viewBox,
  className = "h-full w-full",
  animated = true,
  children,
}: {
  viewBox: string;
  className?: string;
  animated?: boolean;
  children: ReactNode;
}) {
  return (
    <svg viewBox={viewBox} className={`text-foreground ${animated ? "" : "illu-still"} ${className}`} fill="none" aria-hidden="true">
      <g className="svg-hairline" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}
