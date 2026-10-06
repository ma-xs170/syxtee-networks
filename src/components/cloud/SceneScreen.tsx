"use client";

import { useEffect, useRef, useState } from "react";
import { Feed, Slate } from "../mix/parts";
import { layoutOf, visibleItems, type Scene } from "@/lib/cloud-scenes";
import type { MixRelay } from "@/lib/mix-sim";

// Rendu d'une scène OBS Cloud : ses sources visibles, posées selon layoutOf. La source sélectionnée est cerclée de rouge (accent), comme la boîte de sélection d'OBS.

const cqFrame = { width: "min(100cqw, 177.78cqh)" } as const;

export function SceneView({ scene, byId, selectedItem, compact = false }: { scene: Scene | undefined; byId: (id: string) => MixRelay | undefined; selectedItem?: string | null; compact?: boolean }) {
  const items = visibleItems(scene);
  const rects = layoutOf(items.length);
  return (
    <>
      {items.length === 0 && <div className="absolute inset-0 grid place-items-center bg-surface-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{scene ? "Scène vide" : "Aucune scène"}</div>}
      {items.map((it, i) => {
        const r = byId(it.relayId);
        const b = rects[i];
        if (!r) return null;
        return (
          <div key={it.id} className="absolute overflow-hidden" style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}>
            <Feed relay={r} className="absolute inset-0" compact={compact || items.length > 1} />
            {selectedItem === it.id && <span aria-hidden="true" className="pointer-events-none absolute inset-0 border-2 border-accent" />}
          </div>
        );
      })}
    </>
  );
}

/**
 * Écran PROGRAMME ou APERÇU : deux couches, la nouvelle scène est posée sur la couche cachée puis on bascule par l'opacité
 * (`ms` = 0 pour un CUT). Rien n'est démonté pendant le fondu, jamais d'écran noir.
 */
export default function SceneScreen({ sceneId, scenes, byId, kind, ms, slate, selectedItem, tag }: { sceneId: string; scenes: Scene[]; byId: (id: string) => MixRelay | undefined; kind: "program" | "preview" | "edit"; ms: number; slate?: boolean; selectedItem?: string | null; tag?: string }) {
  const [layers, setLayers] = useState<[string, string]>([sceneId, sceneId]);
  const [front, setFront] = useState<0 | 1>(0);
  const frontRef = useRef<0 | 1>(0);
  const layersRef = useRef<[string, string]>([sceneId, sceneId]);

  useEffect(() => {
    if (layersRef.current[frontRef.current] === sceneId) return;
    const back = (1 - frontRef.current) as 0 | 1;
    const next: [string, string] = [...layersRef.current] as [string, string];
    next[back] = sceneId;
    layersRef.current = next;
    // La couche cachée reçoit la nouvelle scène, puis on bascule à l'image suivante (les flux sont déjà ouverts : pas d'attente).
    const raf = requestAnimationFrame(() => {
      setLayers(next);
      frontRef.current = back;
      setFront(back);
    });
    return () => cancelAnimationFrame(raf);
  }, [sceneId]);

  const sceneOf = (id: string) => scenes.find((s) => s.id === id);
  const red = kind === "program" || kind === "edit";
  return (
    <div className="relative aspect-video overflow-hidden bg-black" style={cqFrame}>
      {[0, 1].map((i) => (
        <div key={i} className="absolute inset-0" style={{ opacity: front === i ? 1 : 0, transition: `opacity ${ms}ms linear`, zIndex: front === i ? 1 : 0 }}>
          <SceneView scene={sceneOf(layers[i])} byId={byId} selectedItem={front === i ? selectedItem : null} />
        </div>
      ))}
      {kind !== "preview" && slate && (
        <div className="absolute inset-0 z-[2]">
          <Slate label="BRB" sub="On revient dans un instant" />
        </div>
      )}
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 z-[3] border-[3px] ${red ? "border-live" : "border-emerald-500"}`} />
      {tag && <p className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] truncate px-1 pb-1.5 text-center text-xs font-bold uppercase text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]">{tag}</p>}
    </div>
  );
}
