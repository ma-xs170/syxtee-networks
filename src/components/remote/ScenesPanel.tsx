"use client";

import { btnPrimary, cx, field, panel, panelHead } from "./ui";
import type { Obs } from "./useObs";

// Scènes d'OBS. Touche = passe au programme (ou à l'aperçu en Mode Studio, puis « Transition »).

export default function ScenesPanel({ o, className }: { o: Obs; className?: string }) {
  return (
    <section aria-label="Scènes" className={cx(panel, className)}>
      <h2 className={panelHead}>
        Scènes <span className="font-mono text-xs font-normal tabular-nums text-muted">{o.scenes.length}</span>
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {o.scenes.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted">{o.ready ? (o.loaded ? "Aucune scène dans cette collection." : "Chargement des scènes…") : "En attente d'OBS…"}</p>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
            {o.scenes.map((sc) => {
              const isProgram = sc === o.program;
              const isPreview = o.studioMode && sc === o.preview && !isProgram;
              return (
                <li key={sc}>
                  <button
                    type="button"
                    disabled={!o.ready || !o.canScenes}
                    aria-pressed={o.studioMode ? isPreview : isProgram}
                    onClick={() => o.pick(sc)}
                    className={cx(
                      "flex min-h-10 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-100 active:bg-foreground/15 disabled:opacity-50 max-lg:min-h-12 motion-reduce:transition-none",
                      isProgram ? "border-line-strong bg-foreground/10 font-medium" : isPreview ? "border-foreground/40 bg-transparent" : "border-transparent text-foreground/80 hover:bg-foreground/[0.06]",
                    )}
                  >
                    {isProgram && o.streaming ? <span aria-hidden="true" className="live-dot shrink-0" /> : <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", isProgram ? "bg-foreground" : "border border-faint")} />}
                    <span className="min-w-0 flex-1 break-words leading-tight">{sc}</span>
                    {isProgram && <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted">{o.studioMode ? "programme" : "à l'antenne"}</span>}
                    {isPreview && <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted">aperçu</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {o.studioMode && (
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-line p-2">
          <select value={o.transition} onChange={(e) => o.changeTransition(e.target.value)} aria-label="Transition" disabled={!o.ready || !o.canScenes} className={field}>
            {o.transitions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button type="button" disabled={!o.ready || !o.canScenes} onClick={o.runTransition} className={btnPrimary()}>
            Transition
          </button>
        </div>
      )}
    </section>
  );
}
