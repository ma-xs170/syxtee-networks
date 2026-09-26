// Outils de timeline des ScrollStory. Tout est piloté par un progrès de scroll `v` (0 → 1).

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (x: number) => x * x * (3 - 2 * x);
export const easeOut = (x: number) => 1 - (1 - x) ** 3;

/** 0 → 1 entre a et b, lissé. */
export const ramp = (v: number, a: number, b: number) => smooth(clamp01((v - a) / (b - a)));

/** Monte de a à b, reste à 1, redescend de c à d. */
export const band = (v: number, a: number, b: number, c: number, d: number) =>
  Math.min(ramp(v, a, b), 1 - ramp(v, c, d));

/** Fenêtre [a, b, c, d] : apparition entre a et b, disparition entre c et d. */
export type Band = readonly [number, number, number, number];
