"use client";

import { forwardRef } from "react";
import { Feed, Slate, Vu } from "./parts";
import { isOn, tc, type MixRelay } from "@/lib/mix-sim";

// Centre : PROGRAM (rouge, ON AIR) et PREVIEW (vert) en grand, la grille de toutes les caméras, et la barre de
// transition façon ATEM (sources 1 à 8, CUT, AUTO, durée). Clavier : 1 à 8 = PREVIEW, Entrée = CUT, Espace = AUTO, F = plein écran.

export type Layout = "auto" | "1" | "2" | "3" | "4";
export type TransitionKind = "cut" | "mix";

type Fade = { from: string; to: string; ms: number } | null;

function Tile({ relay, tally, timecode, coreUrl, children }: { relay: MixRelay; tally?: "program" | "preview"; timecode: string; coreUrl?: string; children?: React.ReactNode }) {
  const on = isOn(relay);
  const ring = tally === "program" ? "border-live" : tally === "preview" ? "border-emerald-500" : "border-line";
  return (
    <div className={`relative overflow-hidden rounded-xl border-2 ${ring} bg-background`}>
      <div className="relative aspect-video">
        <Feed relay={relay} coreUrl={coreUrl} className="absolute inset-0" />
        {children}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-background/80 to-transparent p-2">
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-wider sm:text-xs">
            <span className="rounded bg-background/80 px-1.5 py-0.5">CAM {relay.n}</span>
            <span className="max-w-[9rem] truncate text-foreground/90">{relay.name}</span>
          </p>
          {tally && (
            <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-on-accent ${tally === "program" ? "bg-live" : "bg-emerald-600"}`}>
              {tally === "program" ? "ON AIR" : "PREVIEW"}
            </span>
          )}
        </div>
        {on && (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-background/85 to-transparent p-2 font-mono text-[10px] tabular-nums text-foreground/90 sm:text-[11px]">
            <span>
              {timecode} · {relay.kbps.toLocaleString("fr-FR")} kbps · {relay.fps} fps
            </span>
            <span className="flex w-24 items-center gap-2">
              {relay.mute && <span className="text-muted">MUTE</span>}
              <Vu active={!relay.mute} level={0.7} className="min-w-0 flex-1" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function grid(layout: Layout, n: number) {
  const cols = layout === "auto" ? (n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4) : Number(layout);
  return { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4" }[cols as 1 | 2 | 3 | 4];
}

const Multiview = forwardRef<HTMLDivElement, {
  relays: MixRelay[];
  program: string;
  preview: string;
  slate: boolean;
  fade: Fade;
  locked: boolean;
  layout: Layout;
  onLayout: (l: Layout) => void;
  transition: TransitionKind;
  onTransition: (t: TransitionKind) => void;
  duration: number;
  onDuration: (ms: number) => void;
  onPreview: (id: string) => void;
  onCut: () => void;
  onAuto: () => void;
  clock: number;
  fullscreen: boolean;
  onFullscreen: () => void;
  coreUrl?: string;
}>(function Multiview({ relays, program, preview, slate, fade, locked, layout, onLayout, transition, onTransition, duration, onDuration, onPreview, onCut, onAuto, clock, fullscreen, onFullscreen, coreUrl }, ref) {
  const by = (id: string) => relays.find((r) => r.id === id) ?? relays[0];
  const pgm = by(program);
  const pvw = by(preview);
  const sel = "h-9 rounded-lg border border-line bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:opacity-40";

  if (relays.length === 0) return <section ref={ref} className="grid min-h-64 place-items-center rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">Aucun relais à afficher.</section>;

  return (
    <section ref={ref} aria-label="Multiview" className={`space-y-3 rounded-2xl border border-line bg-surface p-3 ${fullscreen ? "overflow-y-auto bg-background" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 font-mono text-xs text-muted">
        <span className="tabular-nums text-foreground">TC {tc(clock)}</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Grille
            <select className={sel} value={layout} onChange={(e) => onLayout(e.target.value as Layout)}>
              <option value="auto">Auto</option>
              <option value="1">1 colonne</option>
              <option value="2">2 colonnes</option>
              <option value="3">3 colonnes</option>
              <option value="4">4 colonnes</option>
            </select>
          </label>
          <button type="button" onClick={onFullscreen} aria-pressed={fullscreen} className="h-9 rounded-lg border border-line px-3 text-sm text-foreground transition-colors hover:bg-foreground/10">
            {fullscreen ? "Quitter" : "Plein écran (F)"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Tile relay={pgm} tally="program" timecode={tc(pgm.uptime)} coreUrl={coreUrl}>
          {fade && (
            <div className="absolute inset-0" style={{ animation: `mix-fade ${fade.ms}ms linear forwards` }} aria-hidden="true">
              <Feed relay={by(fade.to)} className="absolute inset-0" />
            </div>
          )}
          {slate && <Slate label="BRB" sub="On revient dans un instant" />}
        </Tile>
        <Tile relay={pvw} tally="preview" timecode={tc(pvw.uptime)} coreUrl={coreUrl} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-background p-2.5">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sources">
          {Array.from({ length: 8 }, (_, i) => {
            const r = relays.find((x) => x.n === i + 1);
            const isP = r && r.id === program;
            const isV = r && r.id === preview;
            return (
              <button
                key={i}
                type="button"
                disabled={!r || locked}
                onClick={() => r && onPreview(r.id)}
                aria-label={r ? `Source ${i + 1}, ${r.name}` : `Source ${i + 1} vide`}
                className={`grid h-10 w-10 place-items-center rounded-lg border font-mono text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-30 ${
                  isP ? "border-live bg-live text-on-accent" : isV ? "border-emerald-500 bg-emerald-600 text-on-accent" : "border-line hover:bg-foreground/10"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="mx-1 hidden h-8 w-px bg-line sm:block" aria-hidden="true" />
        <button type="button" disabled={locked} onClick={onCut} className="h-10 rounded-lg bg-live px-5 font-mono text-sm font-semibold tracking-wider text-on-accent transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40">
          CUT
        </button>
        <button type="button" disabled={locked} onClick={onAuto} className="h-10 rounded-lg border border-line-strong px-5 font-mono text-sm font-semibold tracking-wider transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40">
          AUTO
        </button>
        <label className="flex items-center gap-2 font-mono text-xs text-muted">
          Type
          <select className={sel} value={transition} disabled={locked} onChange={(e) => onTransition(e.target.value as TransitionKind)}>
            <option value="mix">FADE / MIX</option>
            <option value="cut">CUT</option>
          </select>
        </label>
        <label className="flex items-center gap-2 font-mono text-xs text-muted">
          Durée
          <select className={sel} value={duration} disabled={locked || transition === "cut"} onChange={(e) => onDuration(Number(e.target.value))}>
            {[300, 500, 1000, 2000].map((ms) => (
              <option key={ms} value={ms}>
                {ms / 1000} s
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className={`grid gap-2 ${grid(layout, relays.length)}`} aria-label="Toutes les caméras">
        {[...relays].sort((a, b) => a.n - b.n).map((r) => (
          <li key={r.id}>
            <button type="button" disabled={locked} onClick={() => onPreview(r.id)} className="block w-full text-left disabled:cursor-not-allowed">
              <Tile relay={r} tally={r.id === program ? "program" : r.id === preview ? "preview" : undefined} timecode={tc(r.uptime)} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
});

export default Multiview;
