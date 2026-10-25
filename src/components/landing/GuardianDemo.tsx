"use client";

import { useEffect, useRef, useState } from "react";

// Le Gardien en trois temps, en boucle : OBS en direct, OBS plante (la fenêtre tremble puis se fige), le Gardien le relance et le direct repart.
// Image du direct : vraie vidéo de terrain ; elle se fige au plantage et repart de zéro quand OBS est relancé. Sous prefers-reduced-motion : la fenêtre reste en direct, sans boucle.
const PHASES = [
  { ms: 2800, key: "live" },
  { ms: 2200, key: "crash" },
  { ms: 2400, key: "restart" },
  { ms: 1800, key: "back" },
] as const;

export default function GuardianDemo() {
  const [i, setI] = useState(0);
  const [still, setStill] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lit la préférence du système au montage
    setStill(mq.matches);
    const on = () => setStill(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (still) return;
    const id = window.setTimeout(() => setI((n) => (n + 1) % PHASES.length), PHASES[i].ms);
    return () => window.clearTimeout(id);
  }, [i, still]);

  const phase = still ? "live" : PHASES[i].key;
  const crashed = phase === "crash";
  const restarting = phase === "restart";
  const down = crashed || restarting;

  useEffect(() => {
    const v = video.current;
    if (!v || still) return;
    if (phase === "live") void v.play().catch(() => {});
    else if (crashed) v.pause();
    else if (phase === "back") {
      v.currentTime = 0;
      void v.play().catch(() => {});
    }
  }, [phase, crashed, still]);

  return (
    <div className="w-full" role="img" aria-label="OBS plante en plein direct, puis le Gardien le relance et le direct repart">
      <div className={`overflow-hidden rounded-2xl border bg-surface shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] transition-colors duration-300 ${crashed ? "border-bad/60 guardian-shake" : "border-line"}`}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="size-2.5 rounded-full bg-foreground/20" />
          <span className="size-2.5 rounded-full bg-foreground/20" />
          <span className="size-2.5 rounded-full bg-foreground/20" />
          <span className="ml-3 font-mono text-[11px] text-muted">OBS Studio</span>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-300 ${
              down ? "border-bad/50 text-bad" : "border-live/40 text-live"
            }`}
          >
            <span className={`size-1.5 rounded-full ${down ? "bg-bad" : "bg-live"}`} />
            {crashed ? "Ne répond plus" : restarting ? "Relance" : "En direct"}
          </span>
        </div>

        <div className="relative aspect-video bg-background">
          <video ref={video} className={`absolute inset-0 size-full object-cover transition-[opacity,filter] duration-300 ${down ? "opacity-15 grayscale" : "opacity-90"}`} poster="/videos/hero-scene.jpg" muted loop playsInline autoPlay={!still} preload="metadata">
            <source src="/videos/hero-scene.mp4" type="video/mp4" />
            <source src="/videos/hero-scene.webm" type="video/webm" />
          </video>
          {crashed && <span aria-hidden="true" className="guardian-glitch absolute inset-0" />}
          <div className={`absolute inset-0 grid place-items-center text-center transition-opacity duration-300 ${down ? "opacity-100" : "opacity-0"}`}>
            {crashed ? (
              <p className="font-mono text-sm text-bad">OBS a cessé de répondre</p>
            ) : (
              <div className="w-48">
                <p className="font-mono text-sm text-foreground">Le Gardien relance OBS</p>
                <span className="mt-3 block h-1 overflow-hidden rounded-full bg-foreground/15">
                  <span className={`block h-full rounded-full bg-foreground ${restarting ? "guardian-fill" : "w-0"}`} />
                </span>
              </div>
            )}
          </div>
          <p className={`absolute bottom-3 left-4 rounded-full bg-background/80 px-3 py-1 font-mono text-[11px] text-foreground backdrop-blur transition-opacity duration-500 ${phase === "back" ? "opacity-100" : "opacity-0"}`}>Direct repris</p>
        </div>
      </div>
    </div>
  );
}
