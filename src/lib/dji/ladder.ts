// Échelle de qualité pour les caméras externes : quand le réseau du téléphone ne suit plus, on descend d'un cran
// (la caméra a un débit fixe, elle ne s'adapte pas seule), puis on remonte quand c'est stable. Sans dépendance : testé dans ladder.test.ts.

import type { Resolution } from "./protocol.ts";

export type Rung = { resolution: Resolution; fps: 25 | 30; bitrateKbps: number };

/** Du meilleur au plus léger. Le dernier cran (480p, 0,5 Mb/s) passe sur une 3G correcte. */
export const LADDER: readonly Rung[] = [
  { resolution: "1080p", fps: 30, bitrateKbps: 6000 },
  { resolution: "1080p", fps: 30, bitrateKbps: 4000 },
  { resolution: "720p", fps: 30, bitrateKbps: 3000 },
  { resolution: "720p", fps: 30, bitrateKbps: 2000 },
  { resolution: "720p", fps: 25, bitrateKbps: 1200 },
  { resolution: "480p", fps: 25, bitrateKbps: 800 },
  { resolution: "480p", fps: 25, bitrateKbps: 500 },
];

const RES_ORDER: Record<Resolution, number> = { "480p": 0, "720p": 1, "1080p": 2 };

/** Cran de départ : le meilleur qui ne dépasse ni la résolution ni le débit choisis. */
export function rungIndex(s: { resolution: Resolution; bitrateKbps: number }): number {
  const i = LADDER.findIndex((r) => r.bitrateKbps <= s.bitrateKbps && RES_ORDER[r.resolution] <= RES_ORDER[s.resolution]);
  return i === -1 ? LADDER.length - 1 : i;
}

export const DOWN_AFTER_MS = 12_000;
export const UP_AFTER_MS = 4 * 60_000;
/** Délai après un changement : redémarrage de la caméra (~20 s) puis stabilisation de l'encodeur. */
export const COOLDOWN_MS = 60_000;
const STARVED_RATIO = 0.75;
const HEALTHY_RATIO = 0.9;

export type AbrState = { index: number; ceiling: number; changedAt: number; lowSince: number | null; goodSince: number | null };
export type AbrInput = { now: number; live: boolean; kbps: number | null };
export type AbrAction = "down" | "up" | null;

export const abrInit = (ceiling: number, now: number): AbrState => ({ index: ceiling, ceiling, changedAt: now, lowSince: null, goodSince: null });

/**
 * Un pas du contrôleur, appelé à chaque relevé du relais (environ chaque seconde) tant que la caméra est lancée.
 * « Affamé » = relais hors ligne, ou débit reçu sous 75 % de la cible : le réseau ne suit pas.
 * Descend après 12 s d'affilée ; remonte d'un cran (jamais au-dessus du choix de l'utilisateur) après 4 min à 90 % et plus.
 */
export function abrStep(s: AbrState, i: AbrInput): { state: AbrState; action: AbrAction } {
  if (i.now - s.changedAt < COOLDOWN_MS) return { state: { ...s, lowSince: null, goodSince: null }, action: null };
  const target = LADDER[s.index].bitrateKbps;
  const starved = !i.live || (i.kbps !== null && i.kbps < target * STARVED_RATIO);
  const healthy = i.live && i.kbps !== null && i.kbps >= target * HEALTHY_RATIO;
  const lowSince = starved ? (s.lowSince ?? i.now) : null;
  const goodSince = healthy ? (s.goodSince ?? i.now) : null;
  if (lowSince !== null && i.now - lowSince >= DOWN_AFTER_MS && s.index < LADDER.length - 1) {
    return { state: { ...s, index: s.index + 1, changedAt: i.now, lowSince: null, goodSince: null }, action: "down" };
  }
  if (goodSince !== null && i.now - goodSince >= UP_AFTER_MS && s.index > s.ceiling) {
    return { state: { ...s, index: s.index - 1, changedAt: i.now, lowSince: null, goodSince: null }, action: "up" };
  }
  return { state: { ...s, lowSince, goodSince }, action: null };
}
