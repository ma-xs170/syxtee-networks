"use client";

import { useTransform, type MotionValue } from "motion/react";
import { clamp01, type Band } from "./timeline";

export type SceneRange = { start: number; end: number };

/** Découpe 0 → 1 en `n` scènes égales, ou selon `starts` (début de chaque scène). */
export function sceneRanges(n: number, starts?: readonly number[]): SceneRange[] {
  const s = starts ?? Array.from({ length: n }, (_, i) => i / n);
  return s.map((start, i) => ({ start, end: i < n - 1 ? s[i + 1] : 1 }));
}

/** Fenêtre d'apparition d'une scène : fondu croisé de largeur `overlap` autour de chaque frontière. */
export function defaultSceneBand(i: number, ranges: SceneRange[], overlap: number): Band {
  const h = overlap / 2;
  const { start, end } = ranges[i];
  const first = i === 0;
  const last = i === ranges.length - 1;
  return [first ? -1 : start - h, first ? 0 : start + h, last ? 2 : end - h, last ? 3 : end + h];
}

/** Fenêtres des paragraphes d'une scène : ils se relaient à parts égales, le dernier reste jusqu'au bout. */
export function defaultParagraphBands(range: SceneRange, count: number, fade = 0.02): Band[] {
  const len = range.end - range.start;
  return Array.from({ length: count }, (_, k) => {
    const a = range.start + (len * k) / count;
    const b = range.start + (len * (k + 1)) / count;
    return [k === 0 ? -1 : a - fade / 2, k === 0 ? 0 : a + fade / 2, k === count - 1 ? 2 : b - fade / 2, k === count - 1 ? 3 : b + fade / 2];
  });
}

/** Index de la scène active pour un progrès global. */
export function activeScene(v: number, ranges: SceneRange[]) {
  let i = 0;
  while (i < ranges.length - 1 && v >= ranges[i + 1].start) i++;
  return i;
}

/** Progrès global → progrès local de la scène (0 → 1 entre son début et sa fin). */
export function useSceneProgress(global: MotionValue<number>, { start, end }: SceneRange) {
  return useTransform(global, (v) => clamp01((v - start) / (end - start)));
}
