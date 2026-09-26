"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useAnimationFrame, useMotionValue } from "motion/react";
import { useReducedMotion, useStoryActive } from "./StoryContext";

/**
 * Horloge (secondes) pour les animations en boucle d'une scène : paquets qui circulent, bulles qui montent…
 * Dans un ScrollStory, elle n'avance que quand le bloc sticky est à l'écran (géré par le moteur).
 * Ailleurs, passer `watch` : elle n'avance que quand cet élément est visible.
 * Figée à 0 en version statique (prefers-reduced-motion).
 */
export function useStoryClock(watch?: RefObject<Element | null>) {
  const time = useMotionValue(0);
  const storyActive = useStoryActive();
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const last = useRef<number | null>(null);

  useEffect(() => {
    const el = watch?.current;
    if (storyActive !== null || !el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [watch, storyActive]);

  const running = !reduced && (storyActive ?? visible);

  useAnimationFrame((now) => {
    if (!running) {
      last.current = null;
      return;
    }
    if (last.current !== null) time.set(time.get() + Math.min(0.1, (now - last.current) / 1000));
    last.current = now;
  });

  return time;
}
