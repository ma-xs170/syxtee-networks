"use client";

import { Record as RecordIcon, Stop } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { StudioEngine } from "./engine";
import { hasAudio } from "./model";

// Multiview façon régie TV (Blackmagic ATEM) : aperçu (vert) et programme (rouge) en grand, toutes les scènes en
// vignettes vivantes avec leur tally, horloge, format, REC et niveaux audio. Les tallys sont des états réels : rouge = à l'antenne, vert = prêt.

const PVW = "#22c55e";
const PGM = "var(--live)";
const SLOTS = 8;

function Tile({ label, tally, children, className = "" }: { label: string; tally?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {children}
      <span className="pointer-events-none absolute inset-0" style={{ boxShadow: tally ? `inset 0 0 0 3px ${tally}` : "inset 0 0 0 1px rgba(255,255,255,0.12)" }} />
      <span className="absolute left-2 top-2 max-w-[90%] truncate rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white sm:text-xs" style={tally ? { color: "#fff", background: tally } : undefined}>
        {label}
      </span>
    </div>
  );
}

export default function Multiview({ e, levels, recClock, fade }: { e: StudioEngine; levels: Record<string, number>; recClock: string; fade: boolean }) {
  const pgm = useRef<HTMLCanvasElement>(null);
  const pvw = useRef<HTMLCanvasElement>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    e.attach(pgm.current, pvw.current);
    return () => e.attach(null, null);
  }, [e]);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { program, preview, scenes, sources } = e.project;
  const progName = scenes.find((s) => s.id === program)?.name ?? "";
  const prevName = scenes.find((s) => s.id === preview)?.name ?? "";
  const audio = sources.filter((s) => hasAudio(s.kind) && e.mixer(s.id).ready);
  const btn = "inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-lg border px-5 font-mono text-sm uppercase tracking-[0.12em] transition-colors";

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-3 p-3 lg:p-4">
      {/* Bandeau : heure, date, format, état */}
      <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2" style={{ maxWidth: "min(100%, calc((100dvh - 250px) * 16 / 9))" }}>
        <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl" aria-label="Heure">
          {now ? now.toLocaleTimeString("fr-FR") : "--:--:--"}
        </p>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{now ? now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : ""}</p>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">1280x720 · 30p</p>
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em]">
          <span className="rounded-sm px-2 py-1 text-white" style={{ background: PGM }}>
            PGM {progName}
          </span>
          <span className="rounded-sm px-2 py-1 text-white" style={{ background: PVW }}>
            PVW {prevName}
          </span>
          {e.recording && <span className="text-live">REC {recClock}</span>}
        </p>
      </div>

      {/* Écran : 4 x 4, aperçu et programme sur 2 x 2, huit scènes dessous */}
      <div className="grid aspect-video w-full grid-cols-4 grid-rows-4 gap-1 rounded-lg bg-black p-1" style={{ maxWidth: "min(100%, calc((100dvh - 250px) * 16 / 9))" }}>
        <Tile label={`Aperçu · ${prevName}`} tally={PVW} className="col-span-2 row-span-2">
          <canvas ref={pvw} width={640} height={360} className="h-full w-full" />
        </Tile>
        <Tile label={`Programme · ${progName}`} tally={PGM} className="col-span-2 row-span-2">
          <canvas ref={pgm} width={640} height={360} className="h-full w-full" />
          {audio.length > 0 && (
            <div className="absolute bottom-2 right-2 top-9 flex gap-1" aria-hidden="true">
              {audio.map((s) => {
                const db = e.mixer(s.id).muted || !e.isActive(s.id) ? -100 : (levels[s.id] ?? -100);
                const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
                return (
                  <div key={s.id} className="flex w-2 items-end overflow-hidden rounded-sm bg-white/15">
                    <div className="w-full" style={{ height: `${pct}%`, background: db > -6 ? "var(--live)" : "#22c55e" }} />
                  </div>
                );
              })}
            </div>
          )}
        </Tile>
        {Array.from({ length: SLOTS }, (_, i) => {
          const s = scenes[i];
          if (!s) return <Tile key={`empty-${i}`} label="—" />;
          const tally = s.id === program ? PGM : s.id === preview ? PVW : undefined;
          return (
            <button key={s.id} type="button" onClick={() => e.update((p) => ({ ...p, preview: s.id }))} className="relative block text-left" aria-label={`Mettre « ${s.name} » en aperçu`}>
              <Tile label={s.name} tally={tally} className="h-full w-full">
                <canvas ref={(el) => e.attachTile(s.id, el)} width={320} height={180} className="h-full w-full" />
              </Tile>
            </button>
          );
        })}
      </div>

      {/* Commandes */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => e.swap("cut")} className={`${btn} border-line-strong hover:bg-accent/10`}>
          Cut
        </button>
        <button type="button" onClick={() => e.swap(fade ? "fade" : "cut")} className={`${btn} border-transparent bg-accent text-on-accent hover:bg-accent-hover`}>
          Auto
        </button>
        <button type="button" onClick={() => (e.recording ? e.stopRecording() : e.startRecording())} className={`${btn} ${e.recording ? "border-live bg-live text-white" : "border-line-strong hover:bg-accent/10"}`}>
          {e.recording ? <Stop size={16} weight="fill" /> : <RecordIcon size={16} weight="fill" />}
          {e.recording ? `Stop ${recClock}` : "Rec"}
        </button>
        <p className="w-full text-center text-xs text-muted">Clique une scène pour l&apos;envoyer en aperçu. Cut : coupure. Auto : transition.</p>
      </div>
    </div>
  );
}
