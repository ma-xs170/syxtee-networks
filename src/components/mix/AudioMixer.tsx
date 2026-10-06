"use client";

import { useEffect, useState } from "react";
import { Headphones, Lock } from "@/components/icons";
import Fader, { fmtDb } from "./Fader";
import LevelMeter from "./LevelMeter";
import { gateOf, type AudioMode, type AudioSettings, type Gate } from "@/lib/mix-audio";
import { camColor, isOn, type MixRelay } from "@/lib/mix-sim";

// Mixeur audio, style console. Deux modes (voir mix-audio.ts) : BROADCAST (le son suit la vidéo : seul le PROGRAMME est dans la
// sortie, l'APERÇU est coupé automatiquement) et PODCAST (tous les micros non coupés restent ouverts, la caméra n'y change rien).
// Chaque strip : état de la voie (ON AIR, COUPÉ · APERÇU, MIC ON…), VU stéréo qui continue de bouger même coupé (couleur atténuée),
// fader, M (coupure manuelle, distincte de la coupure automatique), S, et Écouter (PFL, local, jamais dans la sortie).
// PROTECTION active : mode, faders, M et MIC verrouillés. Maquette : niveaux, limiteur et LUFS simulés.

type Patch = Partial<Pick<MixRelay, "volume" | "mute" | "solo">>;

const TONE: Record<Gate["tone"], string> = {
  onair: "bg-live text-on-accent",
  preview: "bg-emerald-600 text-on-accent",
  open: "bg-emerald-600 text-on-accent",
  muted: "bg-foreground/15 text-muted",
  off: "border border-line text-muted",
};

function Btn({ on, tone, big, disabled, onClick, children, title, className = "" }: { on: boolean; tone: string; big: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode; title: string; className?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={on}
      onClick={onClick}
      title={title}
      className={`${big ? "h-11 min-w-11 px-2 text-sm" : "h-6 min-w-6 px-1 text-[10px]"} inline-flex items-center justify-center rounded-md border font-mono font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40 ${on ? tone : "border-line text-muted hover:text-foreground"} ${className}`}
    >
      {children}
    </button>
  );
}

function Strip({ r, gate, mode, locked, big, listening, ms, onPatch, onListen }: { r: MixRelay; gate: Gate; mode: AudioMode; locked: boolean; big: boolean; listening: boolean; ms: number; onPatch: (p: Patch) => void; onListen: () => void }) {
  const on = isOn(r);
  const cut = !gate.open;
  return (
    <li
      className={`flex h-full shrink-0 snap-start flex-col gap-1 rounded-lg border bg-background p-1.5 transition-[opacity,border-color] ${big ? "w-[7.5rem]" : "w-[6.5rem]"} ${gate.tone === "onair" ? "border-live" : gate.tone === "preview" ? "border-emerald-600/70" : gate.tone === "open" ? "border-emerald-600/70" : "border-line"} ${cut ? "opacity-70" : ""}`}
      style={{ transitionDuration: `${ms}ms` }}
    >
      <p className="flex items-center gap-1.5 truncate font-mono text-[10px] font-semibold tracking-wider" title={`${r.name}${on ? "" : " (hors ligne)"}`}>
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={on ? { background: camColor(r.n) } : { border: "1px solid var(--muted)" }} />
        <span className="truncate">CAM {r.n}</span>
      </p>
      <p className={`truncate rounded px-1 py-px text-center font-mono ${big ? "text-[11px]" : "text-[9px]"} font-semibold tracking-wider transition-colors ${TONE[gate.tone]}`} style={{ transitionDuration: `${ms}ms` }}>
        {gate.label}
      </p>
      <div className="flex min-h-0 flex-1 items-stretch justify-center gap-1">
        <LevelMeter active={on} dim={cut} scale seed={r.n * 2.3} hot={r.status === "unstable"} barWidth={big ? 7 : 5} className="shrink-0" label={`Niveau ${r.name}${cut ? " (coupé en sortie)" : ""}`} />
        <Fader db={r.volume} onChange={(volume) => onPatch({ volume })} disabled={locked} label={r.name} wide={big} />
      </div>
      <p className="text-center font-mono text-[10px] tabular-nums text-muted">{fmtDb(r.volume)} dB</p>
      {mode === "podcast" && (
        <Btn big={big} disabled={locked || !on} on={!r.mute && on} tone="border-emerald-500 bg-emerald-600 text-on-accent" onClick={() => onPatch({ mute: !r.mute })} title="Ouvrir ou fermer ce micro" className="w-full">
          {r.mute || !on ? "MIC OFF" : "MIC ON"}
        </Btn>
      )}
      <div className="flex justify-center gap-1">
        {mode === "broadcast" && (
          <Btn big={big} disabled={locked} on={r.mute} tone="border-live bg-live text-on-accent" onClick={() => onPatch({ mute: !r.mute })} title="Coupure manuelle (distincte de la coupure automatique)">M</Btn>
        )}
        <Btn big={big} disabled={locked} on={r.solo} tone="border-yellow-400 bg-yellow-400 text-background" onClick={() => onPatch({ solo: !r.solo })} title="Solo : seul ce micro dans la sortie">S</Btn>
        <Btn big={big} disabled={!on} on={listening} tone="border-sky-400 bg-sky-500 text-on-accent" onClick={onListen} title="Écouter : dans ton casque seulement, jamais dans la sortie">
          <Headphones size={big ? 18 : 12} weight={listening ? "fill" : "regular"} aria-label="Écouter" />
        </Btn>
      </div>
    </li>
  );
}

function Master({ db, onDb, mute, onMute, locked, big, open, mode }: { db: number; onDb: (v: number) => void; mute: boolean; onMute: () => void; locked: boolean; big: boolean; open: number; mode: AudioMode }) {
  const [lufs, setLufs] = useState(-23.4);
  const [lim, setLim] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setLufs(-23 + (Math.random() - 0.5) * 3 + db * 0.6 + Math.max(0, open - 1) * 1.5);
      // Plusieurs micros ouverts s'additionnent : le limiteur travaille davantage.
      setLim(db > 0 || Math.random() < 0.06 + Math.max(0, open - 1) * 0.12);
    }, 700);
    return () => clearInterval(t);
  }, [db, open]);
  return (
    <div className={`flex h-full shrink-0 flex-col gap-1.5 rounded-lg border border-line-strong bg-background p-1.5 ${big ? "w-[8.5rem]" : "w-[8rem]"}`}>
      <p className="font-mono text-[10px] font-semibold tracking-wider">MASTER</p>
      <p className="truncate rounded bg-foreground/15 px-1 py-px text-center font-mono text-[9px] tracking-wider text-muted">{open} {open > 1 ? "MICS" : "MIC"} {mode === "podcast" ? "OUVERT" + (open > 1 ? "S" : "") : "EN SORTIE"}</p>
      <div className="flex min-h-0 flex-1 items-stretch justify-center gap-1.5">
        <LevelMeter active={!mute && open > 0} scale hot seed={99} barWidth={big ? 9 : 7} className="shrink-0" label="Niveau master" />
        <Fader db={db} onChange={onDb} disabled={locked} label="master" wide={big} />
      </div>
      <p className="text-center font-mono text-[10px] tabular-nums text-muted">
        {fmtDb(db)} dB · <span className="text-foreground">{lufs.toFixed(1)}</span> LUFS-M
      </p>
      <div className="flex items-center justify-between gap-1">
        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 font-mono text-[9px] font-semibold ${big ? "h-11" : "h-6"} ${lim ? "border-orange-400 text-orange-300" : "border-line text-muted"}`} title="Limiteur −1 dB : le voyant s'allume quand il réduit le gain">
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${lim ? "bg-orange-400" : "bg-foreground/25"}`} />
          LIM −1
        </span>
        <Btn big={big} disabled={locked} on={mute} tone="border-live bg-live text-on-accent" onClick={onMute} title="Couper le master">MUTE</Btn>
      </div>
    </div>
  );
}

export default function AudioMixer({ relays, program, preview, slate, programMs, locked, master, onMaster, masterMute, onMasterMute, onPatch, settings, onSettings, listen, onListen, big = false, className = "" }: {
  relays: MixRelay[];
  /** Un relais, ou plusieurs (scène OBS Cloud avec plusieurs sources). */
  program: string | string[];
  preview: string | string[];
  slate: boolean;
  /** Durée du fondu vidéo : la voie « ON AIR » s'éteint ou s'allume sur la même durée (0 = CUT, instantané). */
  programMs: number;
  locked: boolean;
  master: number;
  onMaster: (db: number) => void;
  masterMute: boolean;
  onMasterMute: () => void;
  onPatch: (id: string, patch: Patch) => void;
  settings: AudioSettings;
  onSettings: (patch: Partial<AudioSettings>) => void;
  listen: string | null;
  onListen: (id: string) => void;
  /** Mobile : faders et boutons larges (cibles tactiles de 44 px ou plus). */
  big?: boolean;
  className?: string;
}) {
  const soloOn = relays.some((r) => r.solo);
  const gates = new Map(relays.map((r) => [r.id, gateOf(r, { mode: settings.mode, program, preview, slate, soloOn })]));
  const openCount = [...gates.values()].filter((g) => g.open).length;
  const seg = (m: AudioMode) =>
    `${big ? "h-12 px-5 text-sm" : "h-7 px-3 text-[11px]"} rounded-md font-mono font-semibold tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-50 ${settings.mode === m ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`;
  const check = `flex items-center gap-1.5 ${big ? "h-12 text-sm" : "text-[11px]"} text-muted`;
  const listening = listen ? relays.find((r) => r.id === listen) : null;

  return (
    <section aria-label="Mixeur audio" className={`flex min-h-0 flex-col gap-1.5 rounded-xl border border-line bg-surface p-1.5 ${className}`}>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
        <div role="group" aria-label="Mode audio" className="flex rounded-lg border border-line bg-background p-0.5">
          <button type="button" disabled={locked} aria-pressed={settings.mode === "broadcast"} onClick={() => onSettings({ mode: "broadcast" })} className={seg("broadcast")}>BROADCAST</button>
          <button type="button" disabled={locked} aria-pressed={settings.mode === "podcast"} onClick={() => onSettings({ mode: "podcast" })} className={seg("podcast")}>PODCAST</button>
        </div>
        {settings.mode === "podcast" ? (
          <>
            <label className={check}>
              <input type="checkbox" disabled={locked} checked={settings.mixMinus} onChange={(e) => onSettings({ mixMinus: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
              Mix-minus
            </label>
            <label className={check}>
              <input type="checkbox" disabled={locked} checked={settings.autoDuck} onChange={(e) => onSettings({ autoDuck: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
              Réduction auto
            </label>
          </>
        ) : (
          <p className={`${big ? "text-xs" : "text-[11px]"} text-muted`}>Le son suit la vidéo : seul le PROGRAMME est diffusé.</p>
        )}
        {listening && <p className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] text-sky-300"><Headphones size={12} weight="fill" aria-hidden="true" />Écoute locale CAM {listening.n} · jamais diffusée</p>}
        {locked && <Lock size={14} weight="fill" className={listening ? "text-muted" : "ml-auto text-muted"} aria-label="Verrouillé par la protection" />}
      </div>
      <div className="flex min-h-0 flex-1 gap-2">
        <ul className="flex min-w-0 flex-1 snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain">
          {[...relays].sort((a, b) => a.n - b.n).map((r) => (
            <Strip key={r.id} r={r} gate={gates.get(r.id)!} mode={settings.mode} locked={locked} big={big} listening={listen === r.id} ms={programMs} onPatch={(p) => onPatch(r.id, p)} onListen={() => onListen(r.id)} />
          ))}
        </ul>
        <Master db={master} onDb={onMaster} mute={masterMute} onMute={onMasterMute} locked={locked} big={big} open={openCount} mode={settings.mode} />
      </div>
    </section>
  );
}
