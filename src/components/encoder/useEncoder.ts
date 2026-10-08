"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { MockEncoderEngine, type Page, type Snapshot, type Tab } from "@/lib/encoder/mockEngine";

export type { Page, Snapshot, Tab };

/**
 * Hook des écrans de l'Encodeur : s'abonne au moteur (fourni par le provider) et le fait avancer toutes les 700 ms.
 * Pause hors écran (`visible`) et onglet caché ; aucun défilement automatique en « réduire les animations ».
 * La démo publique crée son propre moteur ; le dashboard client prend celui du provider (`getProvider().engine(id)`).
 */
export function useEncoder(engine: MockEncoderEngine, visible: boolean) {
  const reduce = useReducedMotion();
  const st = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  useEffect(() => engine.setReduceMotion(!!reduce), [engine, reduce]);
  useEffect(() => {
    if (reduce || !visible || hidden) return;
    const id = setInterval(() => engine.tick(0.7), 700);
    return () => clearInterval(id);
  }, [engine, reduce, visible, hidden]);
  return { c: st.c, snap: st.snap, auto: st.auto, actions: engine, engine };
}

/** Moteur privé d'une démo (une instance par composant monté). */
export function useDemoEngine() {
  return useState(() => new MockEncoderEngine("enc-demo"))[0];
}

export type EncoderDemo = ReturnType<typeof useEncoder>;
