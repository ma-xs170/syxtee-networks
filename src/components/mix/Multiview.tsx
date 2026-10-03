"use client";

import { forwardRef } from "react";
import { Feed, Slate } from "./parts";
import { isOn, tc, type MixRelay } from "@/lib/mix-sim";

// Multiview comme le projecteur « Vue multiple » d'OBS : APERÇU (vert) à gauche et PROGRAMME (rouge) à droite en grand,
// dessous 8 emplacements en 4 colonnes x 2 rangées, séparés par 6 px de gris clair. Une seule fois chaque caméra.
// Clic = APERÇU, double-clic = PROGRAMME. Les chiffres (kbps, fps, latence) sont dans l'infobulle. Clavier : 1 à 8 = APERÇU,
// Entrée = CUT, Espace = AUTO, F = plein écran. Un relais sans signal affiche la mire fictive (TestPattern), jamais un vrai flux.

export type TransitionKind = "cut" | "mix";
type Fade = { from: string; to: string; ms: number } | null;

const label = "pointer-events-none absolute inset-x-0 bottom-0 truncate px-1 pb-1 text-center font-bold uppercase text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]";

/** Cadre de couleur au-dessus de l'image (rouge = PROGRAMME, vert = APERÇU), sans décaler la mise en page. */
const ring = (tally?: "program" | "preview") => (tally ? `pointer-events-none absolute inset-0 border-[3px] ${tally === "program" ? "border-live" : "border-emerald-500"}` : "hidden");

function Big({ relay, tally, name, coreUrl, children }: { relay: MixRelay; tally: "program" | "preview"; name: string; coreUrl?: string; children?: React.ReactNode }) {
  return (
    // bg-black : surface vidéo, comme le projecteur d'OBS.
    <div className="relative aspect-video overflow-hidden bg-black">
      <Feed relay={relay} coreUrl={coreUrl} className="absolute inset-0" />
      {children}
      <span aria-hidden="true" className={ring(tally)} />
      <p className={`${label} text-sm sm:text-base`}>{name}</p>
    </div>
  );
}

const Multiview = forwardRef<HTMLDivElement, {
  relays: MixRelay[];
  program: string;
  preview: string;
  slate: boolean;
  fade: Fade;
  locked: boolean;
  transition: TransitionKind;
  onTransition: (t: TransitionKind) => void;
  duration: number;
  onDuration: (ms: number) => void;
  onPreview: (id: string) => void;
  onProgram: (id: string) => void;
  onCut: () => void;
  onAuto: () => void;
  clock: number;
  fullscreen: boolean;
  onFullscreen: () => void;
  coreUrl?: string;
}>(function Multiview({ relays, program, preview, slate, fade, locked, transition, onTransition, duration, onDuration, onPreview, onProgram, onCut, onAuto, clock, fullscreen, onFullscreen, coreUrl }, ref) {
  const by = (id: string) => relays.find((r) => r.id === id) ?? relays[0];
  const sel = "h-8 rounded-md border border-line bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:opacity-40";
  const btn = "h-8 rounded-md px-3.5 font-mono text-xs font-semibold tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40";

  if (relays.length === 0) return <section ref={ref} className="grid min-h-48 place-items-center rounded-xl border border-line bg-surface p-4 text-center text-sm text-muted">Aucun relais à afficher.</section>;

  const pgm = by(program);
  const pvw = by(preview);
  const nameOf = (r: MixRelay) => `CAM ${r.n} - ${r.name.toUpperCase()}`;
  const slots = Array.from({ length: 8 }, (_, i) => relays.find((r) => r.n === i + 1) ?? null);

  return (
    <section ref={ref} aria-label="Multiview" className={`w-full space-y-1.5 ${fullscreen ? "overflow-y-auto bg-background p-2" : ""}`}>
      {/* Ligne du haut : APERÇU puis PROGRAMME. */}
      <div className="grid grid-cols-2 gap-[6px] bg-foreground/30 p-[3px]">
        <Big relay={pvw} tally="preview" name="Aperçu" coreUrl={coreUrl} />
        <Big relay={pgm} tally="program" name="Programme" coreUrl={coreUrl}>
          {fade && (
            <div className="absolute inset-0" style={{ animation: `mix-fade ${fade.ms}ms linear forwards` }} aria-hidden="true">
              <Feed relay={by(fade.to)} className="absolute inset-0" />
            </div>
          )}
          {slate && <Slate label="BRB" sub="On revient dans un instant" />}
        </Big>
      </div>

      {/* Barre de transition : une seule ligne fine. */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1">
        <div className="flex gap-1" role="group" aria-label="Sources">
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
                className={`grid h-8 w-8 place-items-center rounded-md border font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-30 ${
                  isP ? "border-live bg-live text-on-accent" : isV ? "border-emerald-500 bg-emerald-600 text-on-accent" : "border-line hover:bg-foreground/10"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <button type="button" disabled={locked} onClick={onCut} className={`${btn} bg-live text-on-accent hover:opacity-90`}>
          CUT
        </button>
        <button type="button" disabled={locked} onClick={onAuto} className={`${btn} border border-line-strong hover:bg-foreground/10`}>
          AUTO
        </button>
        <select aria-label="Type de transition" className={sel} value={transition} disabled={locked} onChange={(e) => onTransition(e.target.value as TransitionKind)}>
          <option value="mix">FADE / MIX</option>
          <option value="cut">CUT</option>
        </select>
        <select aria-label="Durée de la transition" className={sel} value={duration} disabled={locked || transition === "cut"} onChange={(e) => onDuration(Number(e.target.value))}>
          {[300, 500, 1000, 2000].map((ms) => (
            <option key={ms} value={ms}>
              {ms / 1000} s
            </option>
          ))}
        </select>
        <span className="ml-auto font-mono text-xs tabular-nums text-muted">TC {tc(clock)}</span>
        <button type="button" onClick={onFullscreen} aria-pressed={fullscreen} className="h-8 rounded-md border border-line px-2.5 text-xs transition-colors hover:bg-foreground/10">
          {fullscreen ? "Quitter" : "Plein écran (F)"}
        </button>
      </div>

      {/* Huit emplacements, 4 x 2, séparés par du gris clair. Un emplacement sans relais : noir uni, sans libellé. */}
      <ul className="grid grid-cols-4 gap-[6px] bg-foreground/30 p-[3px]" aria-label="Caméras">
        {slots.map((r, i) => (
          <li key={i} className="relative aspect-video overflow-hidden bg-black">
            {r ? (
              <button
                type="button"
                disabled={locked}
                onClick={() => onPreview(r.id)}
                onDoubleClick={() => onProgram(r.id)}
                title={isOn(r) ? `${nameOf(r)} · ${r.kbps.toLocaleString("fr-FR")} kbps · ${r.fps} fps · ${r.latencyMs} ms · ${r.lossPct} % perte` : `${nameOf(r)} · signal absent`}
                aria-label={nameOf(r)}
                className="absolute inset-0 block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/60 disabled:cursor-not-allowed"
              >
                <Feed relay={r} className="absolute inset-0" compact />
                <span aria-hidden="true" className={ring(r.id === program ? "program" : r.id === preview ? "preview" : undefined)} />
                <span className={`${label} text-[10px] sm:text-xs`}>{nameOf(r)}</span>
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
});

export default Multiview;
