// Réglages du scrollytelling Starlink. Tout est piloté par un seul progrès de scroll `v` (0 → 1) :
// scène 1 de 0 à 0,33, scène 2 de 0,33 à 0,66, scène 3 de 0,66 à 1.
// Les fenêtres sont réglées à la main (elles remplacent le découpage automatique du moteur ScrollStory).

import { clamp01, easeOut, lerp, ramp, type Band } from "@/components/story/timeline";

export { band, clamp01, easeOut, lerp, ramp, type Band } from "@/components/story/timeline";

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

/** Début de chaque scène (pour l'indicateur 01 / 02 / 03). */
export const SCENE_STARTS = [0, 0.33, 0.66] as const;

// Moments où chaque scène est figée en version statique (prefers-reduced-motion).
export const STATIC_AT = [0.15, 0.55, 0.97] as const;

/** Ciel étoilé : opacité, dérive (caméra qui monte) et sortie vers le haut (caméra qui redescend). */
export function skyState(v: number, h: number) {
  return {
    alpha: ramp(v, 0.3, 0.37) * (1 - ramp(v, 0.7, 0.76)),
    drift: ramp(v, 0.33, 0.6) * 70,
    exit: ramp(v, 0.6, 0.72) * h * 1.25,
  };
}

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
