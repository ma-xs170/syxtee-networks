import type { Band } from "@/components/story/timeline";

// Timeline de l'histoire SYXTEE PRO (progrès global 0 → 1, 4 scènes égales) :
// S1 0 → 0,25 squelette qui tourne · S2 0,25 → 0,5 vue éclatée · S3 0,5 → 0,75 plein + lieux · S4 0,75 → 1 prix.
export const PRO_TIMELINE = {
  explode: [0.27, 0.36, 0.45, 0.53] as Band,
  labels: [0.33, 0.37, 0.43, 0.46] as Band,
  settle: [0.25, 0.31, 0.47, 0.53] as Band,
  settleEnd: [0.76, 0.84] as readonly [number, number],
  full: [0.5, 0.6] as readonly [number, number],
  places: [0.5, 0.56, 0.74, 0.8] as Band,
};
