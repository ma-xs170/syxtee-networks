// Outils de timeline partagés par les scènes du scrollytelling Starlink.
// Tout est piloté par un seul progrès de scroll `v` (0 → 1) :
// scène 1 de 0 à 0,33, scène 2 de 0,33 à 0,66, scène 3 de 0,66 à 1.

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (x: number) => x * x * (3 - 2 * x);
export const easeOut = (x: number) => 1 - (1 - x) ** 3;

/** 0 → 1 entre a et b, lissé. */
export const ramp = (v: number, a: number, b: number) => smooth(clamp01((v - a) / (b - a)));

/** Monte de a à b, reste à 1, redescend de c à d. */
export const band = (v: number, a: number, b: number, c: number, d: number) =>
  Math.min(ramp(v, a, b), 1 - ramp(v, c, d));

export type Band = readonly [number, number, number, number];

// Fenêtres d'apparition des blocs de texte (les scènes se chevauchent d'environ 0,05).
export const SCENE_BANDS: readonly Band[] = [
  [-1, 0, 0.3, 0.34],
  [0.32, 0.36, 0.63, 0.67],
  [0.645, 0.685, 2, 3],
];

export const PARA_BANDS: readonly (readonly Band[])[] = [
  [
    [-1, 0, 0.13, 0.15],
    [0.15, 0.17, 0.21, 0.23],
    [0.23, 0.25, 2, 3],
  ],
  [
    [-1, 0, 0.47, 0.5],
    [0.5, 0.53, 2, 3],
  ],
  [
    [-1, 0, 0.755, 0.775],
    [0.775, 0.8, 0.84, 0.86],
    [0.86, 0.88, 0.9, 0.92],
  ],
];

export const FINALE_BAND: Band = [0.92, 0.95, 2, 3];

/** Index de la scène active (pour l'indicateur 01 / 02 / 03). */
export const sceneIndex = (v: number) => (v < 0.33 ? 0 : v < 0.66 ? 1 : 2);

// Scène 2 → 3 : position du satellite (coordonnées de la scène, 600 × 600) et du faisceau.
export const MINI_GROUND = { x: 300, y: 468 };

export function satellite(v: number) {
  const t = easeOut(clamp01((v - 0.33) / 0.14));
  const down = ramp(v, 0.6, 0.72);
  return { x: lerp(-700, 300, t), y: lerp(250, 140, t) - 480 * down, down };
}

export function beamPath(v: number) {
  const s = satellite(v);
  const baseY = lerp(620, MINI_GROUND.y, s.down);
  const half = lerp(120, 42, s.down);
  const ay = s.y + 8;
  const f = (n: number) => n.toFixed(1);
  return `M${f(s.x - 1.5)} ${f(ay)}L${f(s.x + 1.5)} ${f(ay)}L${f(s.x + half)} ${f(baseY)}L${f(s.x - half)} ${f(baseY)}Z`;
}
