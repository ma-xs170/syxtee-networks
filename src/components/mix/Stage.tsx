"use client";

import { useEffect, useRef, useState } from "react";
import { Feed, Slate } from "./parts";
import { useStreamHub } from "./streams";
import { tc, type MixRelay } from "@/lib/mix-sim";

// PROGRAMME (bordure rouge) et APERÇU (bordure verte) en 16:9, et la barre CUT / AUTO sur une ligne fine.
// Libellés centrés en bas, blanc gras, comme le projecteur « Vue multiple » d'OBS. Un relais sans signal montre la mire (TestPattern).

export type TransitionKind = "cut" | "mix";
const label = "pointer-events-none absolute inset-x-0 bottom-0 truncate px-1 pb-1.5 text-center text-sm font-bold uppercase text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]";

/**
 * Écran PROGRAMME ou APERÇU : deux couches A et B toujours montées. Quand la caméra change, la nouvelle source est mise sur la couche
 * cachée ; dès qu'elle a une image (déjà le cas pour un flux pré-chauffé), on bascule par l'opacité : `ms` = 0 pour un CUT, la durée
 * réglée pour un fondu. La couche précédente reste visible jusqu'à ce moment : jamais de chargement ni d'écran noir. Rien n'est
 * démonté ni reconnecté (pas de key sur la source).
 */
export function Screen({ relayId, kind, ms, slate, byId, className = "" }: { relayId: string; kind: "program" | "preview"; ms: number; slate?: boolean; byId: (id: string) => MixRelay; className?: string }) {
  const hub = useStreamHub();
  const [layers, setLayers] = useState<[string, string]>([relayId, relayId]);
  const [front, setFront] = useState<0 | 1>(0);
  const frontRef = useRef(0);
  const layersRef = useRef<[string, string]>([relayId, relayId]);

  useEffect(() => {
    if (layersRef.current[frontRef.current] === relayId) return;
    const back = (1 - frontRef.current) as 0 | 1;
    const next: [string, string] = [...layersRef.current] as [string, string];
    next[back] = relayId;
    layersRef.current = next;
    setLayers(next);
    // Bascule dès que la source cachée a une image (au plus 600 ms d'attente, jamais de blocage).
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const r = byId(relayId);
      const warm = !r.real || !hub || hub.ready(relayId);
      if (warm || performance.now() - t0 > 600) {
        frontRef.current = back;
        setFront(back);
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [relayId, hub, byId]);

  return (
    // bg-black : surface vidéo, comme le projecteur d'OBS.
    <div className={`relative aspect-video overflow-hidden bg-black ${className}`}>
      {[0, 1].map((i) => (
        <div key={i} className="absolute inset-0" style={{ opacity: front === i ? 1 : 0, transition: `opacity ${ms}ms linear`, zIndex: front === i ? 1 : 0 }}>
          <Feed relay={byId(layers[i])} className="absolute inset-0" />
        </div>
      ))}
      {kind === "program" && slate && (
        <div className="absolute inset-0 z-[2]">
          <Slate label="BRB" sub="On revient dans un instant" />
        </div>
      )}
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 z-[3] border-[3px] ${kind === "program" ? "border-live" : "border-emerald-500"}`} />
      <p className={`${label} z-[3]`}>{kind === "program" ? "Programme" : "Aperçu"}</p>
    </div>
  );
}

export function TransitionBar({ relays, program, preview, locked, transition, onTransition, duration, onDuration, onPreview, onCut, onAuto, clock, big = false }: {
  relays: MixRelay[];
  program: string;
  preview: string;
  locked: boolean;
  transition: TransitionKind;
  onTransition: (t: TransitionKind) => void;
  duration: number;
  onDuration: (ms: number) => void;
  onPreview: (id: string) => void;
  onCut: () => void;
  onAuto: () => void;
  clock: number;
  big?: boolean;
}) {
  const slots = Array.from({ length: 8 }, (_, i) => relays.find((r) => r.n === i + 1) ?? null);
  const sel = `${big ? "h-12" : "h-8"} rounded-md border border-line bg-background px-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:opacity-40 lg:text-xs`;
  const btn = `${big ? "h-12 px-6 text-base" : "h-8 px-3.5 text-xs"} rounded-md font-mono font-semibold tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40`;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Sources">
        {slots.map((r, i) => {
          const isP = r && r.id === program;
          const isV = r && r.id === preview;
          return (
            <button
              key={i}
              type="button"
              disabled={!r || locked}
              onClick={() => r && onPreview(r.id)}
              aria-label={r ? `Source ${i + 1}, ${r.name}` : `Source ${i + 1} vide`}
              className={`${big ? "h-12 w-12 text-base" : "h-8 w-8 text-xs"} grid place-items-center rounded-md border font-mono font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-30 ${
                isP ? "border-live bg-live text-on-accent" : isV ? "border-emerald-500 bg-emerald-600 text-on-accent" : "border-line hover:bg-foreground/10"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <button type="button" disabled={locked} onClick={onCut} className={`${btn} bg-live text-on-accent hover:opacity-90`}>CUT</button>
      <button type="button" disabled={locked} onClick={onAuto} className={`${btn} border border-line-strong hover:bg-foreground/10`}>AUTO</button>
      <select aria-label="Type de transition" className={sel} value={transition} disabled={locked} onChange={(e) => onTransition(e.target.value as TransitionKind)}>
        <option value="mix">FADE / MIX</option>
        <option value="cut">CUT</option>
      </select>
      <select aria-label="Durée de la transition" className={sel} value={duration} disabled={locked || transition === "cut"} onChange={(e) => onDuration(Number(e.target.value))}>
        {[300, 500, 1000, 2000].map((ms) => <option key={ms} value={ms}>{ms / 1000} s</option>)}
      </select>
      <span className="ml-auto hidden font-mono text-xs tabular-nums text-muted lg:block">TC {tc(clock)}</span>
    </div>
  );
}
