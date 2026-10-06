"use client";

import { Gear } from "@/components/icons";
import ProtocolBadge from "../relais/ProtocolBadge";
import LevelMeter from "./LevelMeter";
import { Feed, StatusPill } from "./parts";
import { camColor, isOn, type MixRelay } from "@/lib/mix-sim";

// Les relais, de deux façons : cellule de bureau (image 16:9 + colonne d'infos avec VU sur le bord droit, engrenage = réglages)
// et grande carte mobile (image pleine largeur, stats, VU horizontal, bouton Programme). Clic = APERÇU, double-clic = PROGRAMME.

const ring = (tally: "program" | "preview" | undefined) => (tally === "program" ? "border-live" : tally === "preview" ? "border-emerald-500" : "border-line");
const tallyOf = (r: MixRelay, program: string, preview: string) => (r.id === program ? "program" : r.id === preview ? "preview" : undefined);

export function RelayCell({ relay: r, program, preview, locked, onPreview, onProgram, onSettings }: { relay: MixRelay; program: string; preview: string; locked: boolean; onPreview: () => void; onProgram: () => void; onSettings: () => void }) {
  const on = isOn(r);
  const tally = tallyOf(r, program, preview);
  return (
    <li className={`relative flex min-h-0 gap-2 overflow-hidden rounded-lg border-2 bg-surface p-1.5 ${ring(tally)} ${on ? "" : "opacity-90"}`}>
      <button type="button" disabled={locked} onClick={onPreview} onDoubleClick={onProgram} aria-label={`CAM ${r.n} ${r.name} : aperçu (double-clic : programme)`} className="absolute inset-0 z-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/60 disabled:cursor-not-allowed" />
      <div className="pointer-events-none relative aspect-video h-full shrink-0 overflow-hidden rounded bg-black">
        <Feed relay={r} className="absolute inset-0" compact />
      </div>
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col justify-between gap-1 py-0.5">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-mono text-[11px] font-semibold tracking-wider">
            <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full align-[-1px]" style={on ? { background: camColor(r.n) } : { border: "1px solid var(--muted)" }} />
            CAM {r.n}
          </p>
          <p className="truncate text-xs">{r.name}</p>
          <ProtocolBadge protocol={r.protocol} />
          <StatusPill status={r.status} />
        </div>
        <p className="font-mono text-[11px] tabular-nums text-muted">{on && r.kbps ? `${r.kbps.toLocaleString("fr-FR")} kbps` : "– kbps"}</p>
      </div>
      <div className="pointer-events-none w-9 shrink-0 py-0.5">
        <LevelMeter active={on && !r.mute} seed={r.n * 2.3} hot={r.status === "unstable"} barWidth={5} label={`Niveau ${r.name}`} />
      </div>
      <button type="button" onClick={onSettings} aria-label={`Réglages de ${r.name}`} className="relative z-10 grid h-7 w-7 shrink-0 place-items-center self-start rounded-md text-muted hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50">
        <Gear size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

export function RelayCard({ relay: r, program, preview, locked, onPreview, onProgram, onSettings }: { relay: MixRelay; program: string; preview: string; locked: boolean; onPreview: () => void; onProgram: () => void; onSettings: () => void }) {
  const on = isOn(r);
  const tally = tallyOf(r, program, preview);
  return (
    <li className={`overflow-hidden rounded-xl border-2 bg-surface ${ring(tally)}`}>
      <button type="button" disabled={locked} onClick={onPreview} aria-label={`CAM ${r.n} ${r.name} : mettre en aperçu`} className="relative block aspect-video w-full overflow-hidden bg-black text-left disabled:cursor-not-allowed">
        <Feed relay={r} className="absolute inset-0" />
        {tally && <span className={`absolute left-2 top-2 rounded px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-on-accent ${tally === "program" ? "bg-live" : "bg-emerald-600"}`}>{tally === "program" ? "PROGRAMME" : "APERÇU"}</span>}
      </button>
      <div className="space-y-2.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium">
            <span className="font-mono text-xs text-muted">CAM {r.n} · </span>
            {r.name}
          </p>
          <ProtocolBadge protocol={r.protocol} />
        </div>
        <StatusPill status={r.status} />
        {on && (
          <dl className="grid grid-cols-3 gap-x-2 gap-y-1 font-mono text-xs tabular-nums text-muted">
            <div><dt className="sr-only">Débit</dt><dd className="text-foreground">{r.kbps ? r.kbps.toLocaleString("fr-FR") : "–"} <span className="text-muted">kbps</span></dd></div>
            <div><dt className="sr-only">Images par seconde</dt><dd className="text-foreground">{r.fps || "–"} <span className="text-muted">fps</span></dd></div>
            <div><dt className="sr-only">Latence</dt><dd className="text-foreground">{r.latencyMs || "–"} <span className="text-muted">ms</span></dd></div>
          </dl>
        )}
        <LevelMeter active={on && !r.mute} vertical={false} seed={r.n * 2.3} barWidth={6} label={`Niveau ${r.name}`} />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button type="button" disabled={locked || !on} onClick={onProgram} className="h-12 rounded-lg bg-live font-mono text-sm font-semibold tracking-wider text-on-accent disabled:cursor-not-allowed disabled:opacity-40">PROGRAMME</button>
          <button type="button" onClick={onSettings} aria-label={`Réglages de ${r.name}`} className="grid h-12 w-12 place-items-center rounded-lg border border-line text-muted hover:bg-foreground/10">
            <Gear size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}
