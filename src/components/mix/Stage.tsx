"use client";

import { Feed, Slate } from "./parts";
import { tc, type MixRelay } from "@/lib/mix-sim";

// PROGRAMME (bordure rouge) et APERÇU (bordure verte) en 16:9, et la barre CUT / AUTO sur une ligne fine.
// Libellés centrés en bas, blanc gras, comme le projecteur « Vue multiple » d'OBS. Une relais sans signal montre la mire (TestPattern).

export type TransitionKind = "cut" | "mix";
export type Fade = { from: string; to: string; ms: number } | null;

const label = "pointer-events-none absolute inset-x-0 bottom-0 truncate px-1 pb-1.5 text-center text-sm font-bold uppercase text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]";

export function Screen({ relay, kind, coreUrl, fade, slate, byId, className = "" }: { relay: MixRelay; kind: "program" | "preview"; coreUrl?: string; fade?: Fade; slate?: boolean; byId?: (id: string) => MixRelay; className?: string }) {
  return (
    // bg-black : surface vidéo, comme le projecteur d'OBS.
    <div className={`relative aspect-video overflow-hidden bg-black ${className}`}>
      <Feed relay={relay} coreUrl={coreUrl} className="absolute inset-0" />
      {kind === "program" && fade && byId && (
        <div className="absolute inset-0" style={{ animation: `mix-fade ${fade.ms}ms linear forwards` }} aria-hidden="true">
          <Feed relay={byId(fade.to)} className="absolute inset-0" />
        </div>
      )}
      {kind === "program" && slate && <Slate label="BRB" sub="On revient dans un instant" />}
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 border-[3px] ${kind === "program" ? "border-live" : "border-emerald-500"}`} />
      <p className={label}>{kind === "program" ? "Programme" : "Aperçu"}</p>
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
