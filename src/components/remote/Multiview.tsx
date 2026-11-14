"use client";

import { useEffect, useRef, useState } from "react";
import { btn, cx, Icon } from "./ui";
import type { Obs } from "./useObs";

// Multiview comme dans OBS : Aperçu et Programme en grand, puis une vignette par scène. Un clic sur une vignette change de scène.
// Les vignettes sont des captures d'écran demandées une à une à OBS (une scène à la fois, pour ne pas charger le poste).

type Shot = { src: string; at: number };

/** Une scène, ou « Aperçu » / « Programme » : image + nom en bas, cadre rouge (programme) ou vert (aperçu). */
function Tile({ label, scene, shot, tone, big, onPick, disabled }: { label: string; scene?: string; shot?: Shot; tone?: "program" | "preview"; big?: boolean; onPick?: () => void; disabled?: boolean }) {
  const inner = (
    <>
      {shot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shot.src} alt="" draggable={false} className="absolute inset-0 size-full object-contain" />
      ) : null}
      <span className={cx("absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-background/80 to-transparent px-2 pb-1.5 pt-6 text-center font-medium", big ? "text-base sm:text-lg" : "font-mono text-[11px] uppercase tracking-wider sm:text-xs")}>
        {label}
        {scene && big ? <span className="ml-2 font-mono text-xs uppercase tracking-wider text-muted">{scene}</span> : null}
      </span>
    </>
  );
  const box = cx("relative aspect-video overflow-hidden rounded-lg bg-black/60", tone === "program" ? "ring-2 ring-bad" : tone === "preview" ? "ring-2 ring-ok" : "ring-1 ring-line");
  return onPick ? (
    <button type="button" disabled={disabled} onClick={onPick} aria-label={`Scène ${label}`} className={cx(box, "text-left transition-[filter] hover:brightness-110 disabled:opacity-60")}>
      {inner}
    </button>
  ) : (
    <div className={box}>{inner}</div>
  );
}

export default function Multiview({ o, onClose }: { o: Obs; onClose: () => void }) {
  const [shots, setShots] = useState<Record<string, Shot>>({});
  const { call } = o;
  // Ordre de rafraîchissement : programme, aperçu, puis les autres scènes ; lu à chaque tour (les scènes peuvent changer).
  const want = useRef<{ program: string; preview: string; rest: string[] }>({ program: "", preview: "", rest: [] });
  useEffect(() => {
    want.current = { program: o.program, preview: o.studioMode ? o.preview : "", rest: o.scenes.filter((s) => s !== o.program && s !== o.preview) };
  }, [o.program, o.preview, o.studioMode, o.scenes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let live = true;
    let i = 0;
    const loop = async () => {
      while (live) {
        const w = want.current;
        if (!o.ready || !w.program || document.hidden) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        // Le programme et l'aperçu (grands) reviennent une fois sur deux ; les autres vignettes tournent.
        const name = i % 2 === 0 ? (i % 4 === 0 || !w.preview ? w.program : w.preview) : (w.rest[Math.floor(i / 2) % Math.max(1, w.rest.length)] ?? w.program);
        const large = name === w.program || name === w.preview;
        i++;
        try {
          const r = await call<{ imageData: string }>("GetSourceScreenshot", { sourceName: name, imageFormat: "jpg", imageWidth: large ? 960 : 320, imageHeight: large ? 540 : 180, imageCompressionQuality: 55 });
          if (live && r?.imageData) setShots((s) => ({ ...s, [name]: { src: r.imageData, at: Date.now() } }));
        } catch {
          /* scène sans image (vide, supprimée) : on passe à la suivante */
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    };
    void loop();
    return () => {
      live = false;
    };
  }, [call, o.ready]);

  const editable = o.ready && o.canScenes;
  return (
    <div role="dialog" aria-modal="true" aria-label="Multiview" className="fixed inset-0 z-50 flex min-h-dvh flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line px-3">
        <h2 className="flex items-baseline gap-2 text-sm font-medium">
          Multiview
          <span className="font-mono text-xs font-normal tabular-nums text-muted">{o.scenes.length} scènes</span>
        </h2>
        <button type="button" onClick={onClose} className={btn("sm")} aria-label="Fermer le Multiview">
          <Icon name="close" />
          <span className="max-sm:sr-only">Fermer</span>
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3">
        <div className="mx-auto grid max-w-[110rem] gap-2 sm:gap-3">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <Tile label="Aperçu" scene={o.studioMode ? o.preview : undefined} shot={o.studioMode ? shots[o.preview] : undefined} tone={o.studioMode ? "preview" : undefined} big />
            <Tile label="Programme" scene={o.program} shot={shots[o.program]} tone="program" big />
          </div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {o.scenes.map((sc) => (
              <li key={sc}>
                <Tile label={sc} shot={shots[sc]} tone={sc === o.program ? "program" : o.studioMode && sc === o.preview ? "preview" : undefined} onPick={() => o.pick(sc)} disabled={!editable} />
              </li>
            ))}
          </ul>
          {o.scenes.length === 0 && <p className="py-6 text-center text-sm text-muted">{o.ready ? "Aucune scène dans cette collection." : "En attente d'OBS…"}</p>}
        </div>
      </div>
    </div>
  );
}
