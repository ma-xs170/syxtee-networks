"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

// Simulation d'un direct IRL, entièrement côté client (aucun backend). Un pas toutes les 700 ms ; le scénario boucle toutes les 15 s :
// stable, la 4G chute, le bonding compense, une mire apparaît si le débit s'effondre, retour à la normale.
// Pause quand l'onglet est caché ou que la démo est hors écran ; en « réduire les animations », aucun défilement automatique.

export type ConnId = "4g" | "5g" | "esim" | "wifi";
export const CONNS: { id: ConnId; label: string; base: number }[] = [
  { id: "4g", label: "4G", base: 2.4 },
  { id: "5g", label: "5G", base: 3.6 },
  { id: "esim", label: "eSIM", base: 1.4 },
  { id: "wifi", label: "Wi-Fi", base: 1.9 },
];
export type Status = "stable" | "unstable" | "offline";
export type LiveSnapshot = {
  seconds: number;
  total: number;
  latency: number;
  loss: number;
  fps: number;
  status: Status;
  slate: boolean;
  rates: Record<ConnId, number>;
  on: Record<ConnId, boolean>;
  history: number[];
  note: string;
};

const LOOP = 15;
const HISTORY = 48;
const noise = (a: number) => (Math.random() - 0.5) * 2 * a;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Sim = { t: number; seconds: number; on: Record<ConnId, boolean>; rates: Record<ConnId, number>; history: number[]; cutUntil: number; latency: number; loss: number };

function init(): Sim {
  const rates = { "4g": 2.4, "5g": 3.6, esim: 1.4, wifi: 1.9 };
  const total = Object.values(rates).reduce((a, b) => a + b, 0);
  return { t: 0, seconds: 842, on: { "4g": true, "5g": true, esim: true, wifi: true }, rates, history: Array(HISTORY).fill(total), cutUntil: -1, latency: 46, loss: 0.2 };
}

function step(s: Sim, dt: number): LiveSnapshot {
  s.t += dt;
  s.seconds += dt;
  const phase = s.t % LOOP;
  const manualCut = s.t < s.cutUntil;
  // 4G : tient jusqu'à 4 s, chute de 4 à 9 s, remonte ensuite.
  const drop4g = phase >= 4 && phase < 9 ? (phase < 5 ? (phase - 4) : phase > 8 ? 9 - phase : 1) : 0;
  let note = "Flux stable : toutes les connexions sont bondées.";
  if (phase >= 4 && phase < 9) note = "La 4G chute : le bonding compense avec les autres connexions.";
  if (phase >= 9 && phase < 11) note = "La 4G revient, le flux se rééquilibre.";
  if (manualCut) note = "Coupure simulée : toutes les connexions sont perdues.";

  const alive = Object.values(s.on).filter(Boolean).length;
  for (const c of CONNS) {
    const comp = alive < 4 && alive > 0 ? 1 + 0.12 * (4 - alive) : 1; // les connexions restantes absorbent une part de la charge
    let target = s.on[c.id] && !manualCut ? c.base * comp : 0;
    if (c.id === "4g") target *= 1 - 0.92 * drop4g;
    else if (drop4g > 0 && target > 0) target *= 1 + 0.1 * drop4g;
    if (target > 0) target = Math.max(0.05, target + noise(0.18));
    s.rates[c.id] = clamp(s.rates[c.id] + (target - s.rates[c.id]) * 0.55, 0, 6);
  }
  const total = Math.max(0, Object.values(s.rates).reduce((a, b) => a + b, 0) * 0.97);
  const capacity = CONNS.reduce((a, c) => a + c.base, 0);
  const deficit = clamp(1 - total / capacity, 0, 1);
  const latTarget = 44 + deficit * 120 + (alive === 0 || manualCut ? 160 : 0);
  s.latency += (latTarget - s.latency) * 0.5 + noise(2.5);
  const lossTarget = 0.15 + deficit * deficit * 7 + (drop4g > 0.5 ? 1.1 : 0);
  s.loss = clamp(s.loss + (lossTarget - s.loss) * 0.5 + noise(0.08), 0, 25);
  const slate = total < 2.4;
  const fps = slate ? 30 : clamp(60 - deficit * 14 + noise(0.4), 24, 60);
  s.history = [...s.history.slice(1), total];
  const status: Status = slate ? "offline" : s.loss > 1.2 || deficit > 0.3 ? "unstable" : "stable";
  if (slate && !manualCut) note = "Débit trop bas : la mire de coupure s'affiche pour les viewers.";
  return { seconds: s.seconds, total, latency: Math.max(20, s.latency), loss: s.loss, fps, status, slate, rates: { ...s.rates }, on: { ...s.on }, history: s.history, note };
}

export function useLiveStats(visible: boolean) {
  const reduce = useReducedMotion();
  const sim = useRef<Sim>(init());
  const [snap, setSnap] = useState<LiveSnapshot>(() => step(init(), 0));
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  useEffect(() => {
    if (reduce || !visible || hidden) return;
    const id = setInterval(() => setSnap(step(sim.current, 0.7)), 700);
    return () => clearInterval(id);
  }, [reduce, visible, hidden]);

  const toggle = useCallback((c: ConnId) => {
    sim.current.on[c] = !sim.current.on[c];
    setSnap(step(sim.current, 0.7));
  }, []);
  const cut = useCallback(() => {
    sim.current.cutUntil = sim.current.t + 3.5;
    setSnap(step(sim.current, 0.7));
  }, []);
  return { snap, toggle, cut, paused: !!reduce };
}
