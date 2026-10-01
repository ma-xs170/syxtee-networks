"use client";

import { useState } from "react";
import { useLiveStatus } from "./LiveStatus";
import StreamHealth from "./StreamHealth";
import StreamPreview from "./StreamPreview";

// Studio d'aperçu, façon régie OBS : à gauche les sources (un relais = une source, point rouge s'il est en direct),
// au centre le flux en temps réel de la source choisie, dessous sa santé (débit, latence, pertes).
// « Multi » affiche toutes les sources en direct côte à côte (4 max) ; un clic sur une vignette l'ouvre en grand.

type Source = { id: string; name: string; live: boolean };
type Mode = "single" | "multi";

const MULTI_MAX = 4;

export default function LiveStudio({ sources, coreUrl, initial }: { sources: Source[]; coreUrl: string; initial: string }) {
  const [current, setCurrent] = useState(initial);
  const [mode, setMode] = useState<Mode>("single");
  const { state } = useLiveStatus();

  // Le statut en temps réel du Core prime sur l'état chargé avec la page.
  const liveIds = new Set(state?.relays?.filter((r) => r.live).map((r) => r.id) ?? sources.filter((s) => s.live).map((s) => s.id));
  const isLive = (id: string) => liveIds.has(id);
  const selected = sources.find((s) => s.id === current) ?? sources[0];
  const multi = sources.filter((s) => isLive(s.id)).slice(0, MULTI_MAX);

  const tab = (m: Mode) =>
    `flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${mode === m ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside aria-label="Sources" className="panel self-start p-4">
        <h2 className="text-sm font-semibold">Sources</h2>
        <div role="group" aria-label="Mode d'affichage" className="mt-3 flex rounded-xl border border-line bg-background p-1">
          <button type="button" className={tab("single")} aria-pressed={mode === "single"} onClick={() => setMode("single")}>
            Une vue
          </button>
          <button type="button" className={tab("multi")} aria-pressed={mode === "multi"} onClick={() => setMode("multi")}>
            Multi
          </button>
        </div>
        <ul className="mt-4 space-y-1">
          {sources.map((s) => {
            const active = mode === "single" && selected?.id === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrent(s.id);
                    setMode("single");
                  }}
                  aria-pressed={active}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    active ? "border border-line-strong bg-accent/10 text-foreground" : "border border-transparent text-muted hover:bg-accent/[0.06] hover:text-foreground"
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  {isLive(s.id) ? <span className="live-dot shrink-0" aria-label="En direct" /> : <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em]">Hors ligne</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="min-w-0">
        {mode === "single" && selected ? (
          <>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-sm font-semibold">Aperçu du direct</h2>
              <p className="font-mono text-xs text-muted">{selected.name}</p>
            </div>
            <StreamPreview key={selected.id} coreUrl={coreUrl} relayId={selected.id} />

            <div className="mt-8">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-semibold">Santé du flux</h2>
                <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${isLive(selected.id) ? "border-live/40 text-foreground" : "border-line text-muted"}`}>
                  {isLive(selected.id) ? "En ligne" : "Hors ligne"}
                </span>
                <span className="text-sm text-muted">{selected.name}</span>
              </div>
              <StreamHealth key={selected.id} coreUrl={coreUrl} relayId={selected.id} />
            </div>
          </>
        ) : multi.length === 0 ? (
          <div className="panel flex min-h-64 items-center justify-center px-6 text-center text-sm text-muted">Aucune source en direct. Lance ton live : les aperçus apparaissent ici.</div>
        ) : (
          <ul className={`grid gap-4 ${multi.length > 1 ? "md:grid-cols-2" : ""}`}>
            {multi.map((s) => (
              <li key={s.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-muted">{s.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrent(s.id);
                      setMode("single");
                    }}
                    className="text-xs text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Ouvrir en grand
                  </button>
                </div>
                <StreamPreview key={s.id} coreUrl={coreUrl} relayId={s.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
