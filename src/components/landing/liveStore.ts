"use client";

import { useSyncExternalStore } from "react";

// Petit magasin partagé : la démo live publie l'état du boîtier (LED par connexion, statut), le schéma et le hero s'y abonnent.
export type BoxLeds = Record<"4g" | "5g" | "esim" | "sat", "ok" | "warn" | "bad" | "off">;
export type BoxState = { leds: BoxLeds; status: "stable" | "unstable" | "offline" };
let state: BoxState = { leds: { "4g": "ok", "5g": "ok", esim: "ok", sat: "ok" }, status: "stable" };
const subs = new Set<() => void>();
export function publishBox(next: BoxState) {
  const a = JSON.stringify(state);
  if (a === JSON.stringify(next)) return;
  state = next;
  subs.forEach((f) => f());
}
export const useBoxState = () => useSyncExternalStore((cb) => (subs.add(cb), () => void subs.delete(cb)), () => state, () => state);
