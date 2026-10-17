"use client";

import { useCallback, useState } from "react";
import ProgramPreview from "./ProgramPreview";
import ProgramVideo, { type PreviewLevel } from "./ProgramVideo";
import { btn, cx, Icon } from "./ui";
import type { Obs } from "./useObs";

// Aperçu du programme (et, en Mode Studio, de la scène d'aperçu à côté). Vidéo + son par WebRTC, ou images si le plugin ne peut pas faire de vidéo.

/** `ratio` : téléphone en portrait, la zone d'image garde le format 16/9 au lieu de remplir la hauteur. */
export default function ProgramView({ o, className, ratio }: { o: Obs; className?: string; ratio?: boolean }) {
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const video = o.pmode.mode === "video";
  // Un ancien plugin ne connaît pas la commande : on l'ignore sans bruit (l'aperçu garde sa qualité fixe).
  const { call } = o;
  const quality = useCallback((level: PreviewLevel) => void call("link.setPreviewQuality", { level }).catch(() => {}), [call]);
  const box = ratio ? "mx-auto aspect-video h-[22dvh] max-w-full" : "h-full";
  return (
    <section aria-label="Programme" className={cx("grid min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-xl border border-line bg-surface", className)}>
      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2">
        <p className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden whitespace-nowrap text-sm">
          <span className="text-muted max-sm:hidden">Programme</span>
          <span className="truncate font-medium">{o.program || "—"}</span>
          {o.streaming ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-live">
              <span aria-hidden="true" className="live-dot" />
              En direct
            </span>
          ) : null}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {!muted && video && <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume de l'aperçu" className="rm-range w-24 max-sm:hidden" />}
          <button
            type="button"
            disabled={!o.previewOn || !video}
            title={video ? undefined : "Le son n'est disponible qu'avec l'aperçu vidéo"}
            aria-pressed={!muted}
            aria-label={muted ? "Activer le son de l'aperçu" : "Couper le son de l'aperçu"}
            onClick={() => setMuted((m) => !m)}
            className={cx(btn("sm"), !muted && "!border-foreground/40 !bg-foreground/15")}
          >
            <Icon name={muted ? "speaker-off" : "speaker"} />
            <span className="max-sm:sr-only">{muted ? "Muet" : "Son"}</span>
          </button>
          <button type="button" disabled={!o.ready} aria-pressed={o.previewOn} onClick={() => o.setPreviewEnabled(!o.previewOn)} className={btn("sm")} aria-label={o.previewOn ? "Couper l'aperçu" : "Activer l'aperçu"}>
            <Icon name={o.previewOn ? "eye" : "eye-off"} />
            <span className="max-sm:sr-only">{o.previewOn ? "Couper l'aperçu" : "Activer l'aperçu"}</span>
          </button>
        </div>
      </div>
      <div className={cx("min-h-0 px-2 pb-2", o.studioMode && "grid grid-cols-2 items-start gap-2")}>
        {o.studioMode && (
          <div className={cx("relative min-h-0 overflow-hidden rounded-lg bg-surface-2", box)}>
            <span className="absolute left-2 top-1.5 z-10 max-w-[90%] truncate rounded bg-background/70 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted">Aperçu · {o.preview || "—"}</span>
            <ProgramPreview sinkRef={o.previewSink} program={o.preview} live={false} title="Aperçu" />
          </div>
        )}
        <div className={cx("relative min-h-0 overflow-hidden rounded-lg bg-surface-2", box)}>
          {o.previewOn && o.pmode.mode === "jpeg" ? (
            <>
              <ProgramPreview sinkRef={o.frameSink} program={o.program} live={o.streaming} title="Programme" />
              <p role="status" className="absolute inset-x-1 bottom-1 truncate rounded bg-background/80 px-2 py-0.5 text-center text-xs text-muted">
                Aperçu en images, sans son{o.pmode.reason ? ` : ${o.pmode.reason}` : ""}
              </p>
            </>
          ) : o.previewOn ? (
            <ProgramVideo watch={o.watch} program={o.program} muted={muted} volume={volume} onQuality={quality} />
          ) : (
            <div className="grid h-full place-items-center p-4 text-center">
              <div>
                <p className="text-sm font-medium">Aperçu coupé</p>
                <p className="mt-1 text-[13px] text-muted">Il ne consomme rien sur le PC tant qu&apos;il est coupé.</p>
                <button type="button" disabled={!o.ready} onClick={() => o.setPreviewEnabled(true)} className={cx(btn("sm"), "mt-3")}>
                  Activer l&apos;aperçu
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
