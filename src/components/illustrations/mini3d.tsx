// Starlink Mini en 3D filaire (projection orthographique 3/4), générique et sans logo.
// Le même dessin sert à l'illustration StarlinkMini et à la vue éclatée de la scène 1 du scrollytelling :
// `miniFrame(v)` calcule la pose pour un progrès v (0 = assemblé sur sa béquille), `MiniDrawing` la dessine,
// `applyMiniFrame` met à jour le DOM sans re-render React (scroll).

import { band, clamp01, lerp, ramp } from "@/components/story/timeline";

// Dimensions réelles (mm) : 298,5 × 259 × 38,5.
const W = 298.5;
const D = 259;
const S = 0.78; // mm → unités SVG
const CX = 200;
const CY = 292;
const GAP = 92; // écart max entre deux couches en vue éclatée (mm)
export const LABEL_X = 382;

const DEG = Math.PI / 180;
const YAW = 36 * DEG;
const PITCH = 26 * DEG;
const cyw = Math.cos(YAW);
const syw = Math.sin(YAW);
const cp = Math.cos(PITCH);
const sp = Math.sin(PITCH);

type V3 = [number, number, number];
const add = (...vs: V3[]): V3 => vs.reduce<V3>((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]);
const mul = (v: V3, k: number): V3 => [v[0] * k, v[1] * k, v[2] * k];

// Projection linéaire (sans translation) puis passage en coordonnées écran.
function proj(v: V3): [number, number] {
  const x1 = v[0] * cyw - v[2] * syw;
  const z1 = v[0] * syw + v[2] * cyw;
  return [x1 * S, (-v[1] * cp + z1 * sp) * S];
}
const screen = (v: V3): [number, number] => {
  const [x, y] = proj(v);
  return [CX + x, CY + y];
};
const f1 = (n: number) => n.toFixed(1);
const f4 = (n: number) => n.toFixed(4);
const r3 = (n: number) => Math.round(n * 1000) / 1000;

// Matrice SVG qui plaque un dessin 2D (u, v en mm) sur le plan d'origine o et d'axes a, b.
function plane(o: V3, a: V3, b: V3) {
  const [ax, ay] = proj(a);
  const [bx, by] = proj(b);
  const [ox, oy] = screen(o);
  return `matrix(${f4(ax)} ${f4(ay)} ${f4(bx)} ${f4(by)} ${f1(ox)} ${f1(oy)})`;
}

export const LAYERS = [
  { key: "stand", label: ["Béquille"] },
  { key: "case", label: ["Boîtier + alimentation", "12-48 V / USB-C PD 100 W"] },
  { key: "router", label: ["Routeur Wi-Fi 5 intégré"] },
  { key: "antenna", label: ["Antenne à réseau phasé"] },
  { key: "cover", label: ["Capot de protection"] },
] as const;

const PLANES = ["stand", "caseBottom", "caseTop", "caseSide", "router", "antenna", "coverBottom", "coverTop"] as const;
type PlaneId = (typeof PLANES)[number];

// Grille de l'antenne : 12 × 10 cellules.
const COLS = 12;
const ROWS = 10;
const CELL = 13;
const PITCH_U = (W - 56) / COLS;
const PITCH_V = (D - 56) / ROWS;
const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  return {
    x: -W / 2 + 28 + c * PITCH_U + (PITCH_U - CELL) / 2,
    y: -D / 2 + 28 + r * PITCH_V + (PITCH_V - CELL) / 2,
    d: (c / (COLS - 1) + (ROWS - 1 - r) / (ROWS - 1)) / 2, // distance au coin avant-gauche, 0 → 1
  };
});

const SOC = { u: -58, v: 18 }; // puce du routeur (d'où partent les ondes Wi-Fi)

export type MiniFrame = {
  dy: number;
  opacity: number;
  planes: Record<PlaneId, string>;
  edges: { case: string; cover: string };
  layer: number[];
  labels: { ax: number; ay: number; ly: number; o: number }[];
  cells: number[];
  wifi: { x: number; y: number; o: number };
};

export function miniFrame(v: number): MiniFrame {
  // Vue éclatée : les couches s'écartent l'une après l'autre (capot d'abord), puis se referment.
  const close = ramp(v, 0.265, 0.3);
  const gap = [0, ...[3, 2, 1, 0].map((k) => ramp(v, 0.03 + 0.017 * k, 0.075 + 0.017 * k) * (1 - close))];
  const lifts = [0];
  for (let j = 1; j < 5; j++) lifts.push(lifts[j - 1] + GAP * gap[j]);
  const center = lifts[4] / 2;
  const lift = (j: number): V3 => [0, lifts[j] - center, 0];

  // Inclinaison : 52° sur la béquille, 30° en vue éclatée, puis à plat face au ciel.
  const alpha = lerp(lerp(52, 30, ramp(v, 0.03, 0.1)), 0, ramp(v, 0.29, 0.33)) * DEG;
  const fold = lerp(95, 0, ramp(v, 0.285, 0.325)) * DEG; // la béquille se replie
  const U: V3 = [1, 0, 0];
  const V: V3 = [0, Math.sin(alpha), -Math.cos(alpha)]; // de l'avant vers l'arrière
  const N: V3 = [0, Math.cos(alpha), Math.sin(alpha)]; // normale, vers le ciel
  const leg = add(mul(V, Math.cos(fold)), mul(N, -Math.sin(fold)));
  const P = (j: number, u: number, w: number, n: number) => add(mul(U, u), mul(V, w), mul(N, n), lift(j));

  const planes: Record<PlaneId, string> = {
    stand: plane(P(0, 0, D * 0.12, 0), U, leg),
    caseBottom: plane(P(1, 0, 0, 0), U, V),
    caseTop: plane(P(1, 0, 0, 24), U, V),
    caseSide: plane(P(1, W / 2, 0, 0), V, N),
    router: plane(P(2, 0, 0, 26), U, V),
    antenna: plane(P(3, 0, 0, 31), U, V),
    coverBottom: plane(P(4, 0, 0, 32), U, V),
    coverTop: plane(P(4, 0, 0, 38.5), U, V),
  };

  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => [a * (W / 2 - 5), b * (D / 2 - 5)]);
  const edgePath = (j: number, n0: number, n1: number) =>
    corners
      .map(([u, w]) => {
        const [x0, y0] = screen(P(j, u, w, n0));
        const [x1, y1] = screen(P(j, u, w, n1));
        return `M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}`;
      })
      .join("");

  // Mise en avant d'une couche selon le paragraphe affiché.
  const hl = [0, band(v, 0.22, 0.24, 0.28, 0.3), band(v, 0.15, 0.17, 0.21, 0.23), band(v, 0.05, 0.07, 0.13, 0.15), 0];
  const anyHl = Math.max(...hl);
  const emph = hl.map((h) => Math.max(h, 1 - anyHl));
  const layer = emph.map((e) => r3(0.3 + 0.7 * e));

  // Labels : ancrés sur le coin le plus à droite de chaque couche.
  const topN = [0, 24, 26, 31, 38.5];
  const labels = LAYERS.map((_, j) => {
    let pt: [number, number];
    if (j === 0) {
      pt = screen(add(P(0, W * 0.06, D * 0.12, 0), mul(leg, 150)));
    } else {
      pt = corners.map(([u, w]) => screen(P(j, u, w, topN[j]))).reduce((a, b) => (b[0] > a[0] ? b : a));
    }
    return { ax: pt[0], ay: pt[1], ly: pt[1], o: r3(gap[Math.max(j, 1)] * (0.45 + 0.55 * emph[j])) };
  });
  // Évite que deux labels se chevauchent (de haut en bas : capot → béquille).
  for (let j = 3; j >= 0; j--) {
    const minGap = LAYERS[j + 1].label.length > 1 ? 40 : 26;
    labels[j].ly = Math.max(labels[j].ly, labels[j + 1].ly + minGap);
  }

  // Vague sur la grille de l'antenne.
  const w = ((v - 0.05) / 0.09) * 1.3 - 0.15;
  const cellsO = cells.map((c) => {
    const x = w - c.d;
    const flash = Math.exp(-((x / 0.12) ** 2));
    const lit = clamp01(x / 0.1);
    return r3(Math.max(0.85 * flash, 0.1 * lit));
  });

  const [wx, wy] = screen(P(2, SOC.u, SOC.v, 26));

  return {
    dy: r3(200 * ramp(v, 0.31, 0.36)),
    opacity: r3(1 - ramp(v, 0.315, 0.355)),
    planes,
    edges: { case: edgePath(1, 0, 24), cover: edgePath(4, 32, 38.5) },
    layer,
    labels,
    cells: cellsO,
    wifi: { x: wx, y: wy - 6, o: r3(hl[2]) },
  };
}

const leadPath = (l: MiniFrame["labels"][number]) => `M${f1(l.ax + 6)} ${f1(l.ay)}L${f1(LABEL_X - 10)} ${f1(l.ly)}`;

/** Met à jour les attributs du dessin (trouvés par data-k) pour une nouvelle pose. */
export function applyMiniFrame(els: Map<string, Element>, f: MiniFrame) {
  const set = (k: string, attr: string, value: string | number) => els.get(k)?.setAttribute(attr, String(value));
  set("root", "transform", `translate(0 ${f1(f.dy)})`);
  set("root", "opacity", f.opacity.toFixed(3));
  for (const id of PLANES) set(`p-${id}`, "transform", f.planes[id]);
  set("e-case", "d", f.edges.case);
  set("e-cover", "d", f.edges.cover);
  f.layer.forEach((o, j) => set(`l-${j}`, "opacity", o.toFixed(3)));
  f.labels.forEach((l, j) => {
    set(`lab-${j}`, "opacity", l.o.toFixed(3));
    set(`lead-${j}`, "d", leadPath(l));
    set(`labt-${j}`, "transform", `translate(${LABEL_X} ${f1(l.ly)})`);
  });
  f.cells.forEach((o, i) => set(`c${i}`, "fill-opacity", o.toFixed(3)));
  set("wifi", "transform", `translate(${f1(f.wifi.x)} ${f1(f.wifi.y)})`);
  set("wifi", "opacity", f.wifi.o.toFixed(3));
}

/**
 * Le dessin lui-même, rendu à la pose `f`. Chaque élément animable porte un data-k.
 * `labels` : affiche les labels de la vue éclatée. `led` : LED d'activité rouge sur le flanc.
 */
export function MiniDrawing({ f, labels = false, led = false }: { f: MiniFrame; labels?: boolean; led?: boolean }) {
  return (
    <g data-k="root" transform={`translate(0 ${f1(f.dy)})`} opacity={f.opacity} className="svg-hairline">
      <g stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* 0 · Béquille */}
        <g data-k="l-0" opacity={f.layer[0]}>
          <g data-k="p-stand" transform={f.planes.stand}>
            <rect x={-40} y={0} width={80} height={150} rx={8} />
            <path d="M-40 12H40M-30 138H30" strokeWidth={1} />
            <circle cx={-26} cy={6} r={2.5} strokeWidth={1} />
            <circle cx={26} cy={6} r={2.5} strokeWidth={1} />
          </g>
        </g>

        {/* 1 · Boîtier + alimentation */}
        <g data-k="l-1" opacity={f.layer[1]}>
          <g data-k="p-caseBottom" transform={f.planes.caseBottom}>
            <rect x={-W / 2} y={-D / 2} width={W} height={D} rx={16} />
          </g>
          <path data-k="e-case" d={f.edges.case} />
          <g data-k="p-caseTop" transform={f.planes.caseTop}>
            <rect x={-W / 2} y={-D / 2} width={W} height={D} rx={16} fill="currentColor" fillOpacity={0.04} />
            <rect x={30} y={-60} width={96} height={120} rx={6} strokeWidth={1} strokeDasharray="4 6" />
            <path d="M58 -18l-10 22h14l-10 22" strokeWidth={1} />
            {[-110, -95, -80].map((x) => (
              <path key={x} d={`M${x} 70v40`} strokeWidth={1} />
            ))}
          </g>
          <g data-k="p-caseSide" transform={f.planes.caseSide}>
            <rect x={-70} y={9} width={30} height={9} rx={4.5} strokeWidth={1} />
            <circle cx={-18} cy={13.5} r={5} strokeWidth={1} />
            {led && <circle cx={20} cy={13.5} r={2.2} className="led-blink" fill="var(--live)" stroke="none" />}
          </g>
        </g>

        {/* 2 · Routeur Wi-Fi */}
        <g data-k="l-2" opacity={f.layer[2]}>
          <g data-k="p-router" transform={f.planes.router}>
            <rect x={-W / 2 + 18} y={-D / 2 + 18} width={W - 36} height={D - 36} rx={8} />
            <rect x={SOC.u - 22} y={SOC.v - 22} width={44} height={44} rx={3} fill="currentColor" fillOpacity={0.06} />
            <rect x={10} y={-70} width={34} height={22} rx={2} strokeWidth={1} />
            <rect x={60} y={-70} width={34} height={22} rx={2} strokeWidth={1} />
            <path
              d={`M${SOC.u + 22} ${SOC.v}H0V-59H10M${SOC.u} ${SOC.v + 22}V80H90M0 ${SOC.v}V60H40`}
              strokeWidth={1}
            />
            <circle cx={110} cy={90} r={5} strokeWidth={1} />
            <circle cx={-110} cy={-90} r={5} strokeWidth={1} />
            <circle cx={110} cy={-90} r={3} strokeWidth={1} />
            <circle cx={-110} cy={90} r={3} strokeWidth={1} />
          </g>
          <g data-k="wifi" transform={`translate(${f1(f.wifi.x)} ${f1(f.wifi.y)})`} opacity={f.wifi.o} strokeWidth={1.25}>
            {[14, 27, 40].map((r, i) => (
              <path
                key={r}
                className="wifi-pulse"
                style={{ animationDelay: `${i * 0.25}s` }}
                d={`M${f1(-r * 0.7)} ${f1(-r * 0.7)}A${r} ${r} 0 0 1 ${f1(r * 0.7)} ${f1(-r * 0.7)}`}
              />
            ))}
          </g>
        </g>

        {/* 3 · Antenne à réseau phasé */}
        <g data-k="l-3" opacity={f.layer[3]}>
          <g data-k="p-antenna" transform={f.planes.antenna}>
            <rect x={-W / 2 + 12} y={-D / 2 + 12} width={W - 24} height={D - 24} rx={10} />
            {cells.map((c, i) => (
              <rect
                key={i}
                data-k={`c${i}`}
                x={c.x}
                y={c.y}
                width={CELL}
                height={CELL}
                rx={1.5}
                strokeWidth={0.75}
                fill="currentColor"
                fillOpacity={f.cells[i]}
              />
            ))}
          </g>
        </g>

        {/* 4 · Capot */}
        <g data-k="l-4" opacity={f.layer[4]}>
          <g data-k="p-coverBottom" transform={f.planes.coverBottom}>
            <rect x={-W / 2} y={-D / 2} width={W} height={D} rx={18} />
          </g>
          <path data-k="e-cover" d={f.edges.cover} />
          <g data-k="p-coverTop" transform={f.planes.coverTop}>
            <rect x={-W / 2} y={-D / 2} width={W} height={D} rx={18} fill="currentColor" fillOpacity={0.05} />
            <rect x={-W / 2 + 9} y={-D / 2 + 9} width={W - 18} height={D - 18} rx={13} strokeWidth={1} opacity={0.6} />
            {[
              [-W / 2 + 18, -D / 2 + 18],
              [W / 2 - 18, -D / 2 + 18],
              [W / 2 - 18, D / 2 - 18],
              [-W / 2 + 18, D / 2 - 18],
            ].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r={2.5} strokeWidth={1} />
            ))}
          </g>
        </g>
      </g>

      {labels &&
        f.labels.map((l, j) => (
          <g key={LAYERS[j].key} data-k={`lab-${j}`} opacity={l.o}>
            <path
              data-k={`lead-${j}`}
              d={leadPath(l)}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="2 4"
              strokeOpacity={0.6}
            />
            <g data-k={`labt-${j}`} transform={`translate(${LABEL_X} ${f1(l.ly)})`} className="font-mono">
              {LAYERS[j].label.map((line, k) => (
                <text
                  key={line}
                  y={4 + k * 18}
                  fill={k === 0 ? "var(--foreground)" : "var(--muted)"}
                  className="text-[17px] sm:text-[15px] lg:text-[12px]"
                >
                  {line}
                </text>
              ))}
            </g>
          </g>
        ))}
    </g>
  );
}
