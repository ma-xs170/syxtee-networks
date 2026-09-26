"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

// Vrai quand le bloc sticky du ScrollStory est à l'écran. Les canvas s'en servent pour se mettre en pause.
// null en dehors d'un ScrollStory : le composant gère alors lui-même sa visibilité.
export const StoryActiveContext = createContext<boolean | null>(null);
export const useStoryActive = () => useContext(StoryActiveContext);

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(reducedQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
export const useReducedMotion = () =>
  useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);
