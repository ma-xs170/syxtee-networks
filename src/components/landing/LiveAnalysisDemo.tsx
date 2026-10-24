"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import RelayAnalysis, { type AnalysisDemo, type Sample } from "@/components/relais/RelayAnalysis";

// Analyse en temps réel de l'accueil : la courbe du débit du dashboard (composant réel), alimenté par un flux simulé (un relevé par seconde).
// Le flux ne tourne que lorsque le bloc est à l'écran. prefers-reduced-motion : une image fixe, sans défilement.

const POINTS = 900; // 15 min, un relevé par seconde
const PEERS = [{ connection_id: "a", bitrate: 3100 }, { connection_id: "b", bitrate: 1800 }, { connection_id: "c", bitrate: 450 }];

/** Relevé simulé n° `i` : débit qui respire, quelques pics, un peu de latence et de pertes. Déterministe : pas de hasard. */
function sample(i: number, t: number): Sample {
  const spike = i % 263 === 0 ? 1500 : i % 389 === 0 ? 1100 : 0;
  return {
    t,
    bitrate: Math.round(5200 + Math.sin(i / 23) * 700 + Math.sin(i / 5.3) * 250 + spike),
    rtt: Math.round(38 + Math.sin(i / 17) * 9 + (spike ? 45 : 0)),
    dropped: i % 97 === 0 ? 2 : 0,
    congestion: 0.05,
    links: 3,
  };
}

export default function LiveAnalysisDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "0px 0px -20% 0px" });
  const reduce = useReducedMotion();
  const [state, setState] = useState<{ i: number; history: Sample[] } | null>(null);

  // Historique de départ créé dans le navigateur (l'heure du serveur ne doit pas servir : pas d'écart à l'hydratation).
  useEffect(() => {
    const end = Date.now();
    setState({ i: POINTS, history: Array.from({ length: POINTS }, (_, k) => sample(k, end - (POINTS - 1 - k) * 1000)) });
  }, []);

  const running = inView && !reduce && state !== null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setState((prev) => {
        if (!prev) return prev;
        const next = sample(prev.i, Date.now());
        return { i: prev.i + 1, history: [...prev.history.slice(-(POINTS - 1)), next] };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const demo = useMemo<AnalysisDemo | null>(() => {
    if (!state) return null;
    const last = state.history[state.history.length - 1];
    return { live: { live: true, since: state.history[0].t, sample: last, peers: PEERS }, history: state.history };
  }, [state]);

  return (
    <div ref={ref} className="min-h-[340px]">
      {demo ? <RelayAnalysis coreUrl="" relayId="demo" demo={demo} chartOnly /> : <div className="h-[340px] rounded-2xl border border-line bg-surface" aria-hidden="true" />}
    </div>
  );
}
