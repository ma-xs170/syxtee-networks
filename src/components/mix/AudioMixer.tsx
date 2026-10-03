"use client";

import { useEffect, useState } from "react";
import { Lock } from "@phosphor-icons/react";
import Fader, { fmtDb } from "./Fader";
import LevelMeter from "./LevelMeter";
import { camColor, isOn, type MixRelay } from "@/lib/mix-sim";

// Mixeur audio, style console : un strip par relais (nom, VU stéréo gradué, fader long, M / S / AFV) et un MASTER fixé à droite
// (VU plus grand, limiteur avec voyant, MUTE MASTER, LUFS momentané). PROTECTION active : tout est verrouillé (cadenas visible).
// Maquette : niveaux, limiteur et LUFS sont simulés ; le mixage réel se fera côté serveur.

type Patch = Partial<Pick<MixRelay, "volume" | "mute" | "solo" | "afv">>;

function Btn({ on, tone, big, disabled, onClick, children, title }: { on: boolean; tone: string; big: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={on}
      onClick={onClick}
      title={title}
      className={`${big ? "h-11 min-w-11 px-2 text-sm" : "h-6 min-w-6 px-1 text-[10px]"} rounded-md border font-mono font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40 ${on ? tone : "border-line text-muted hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function Strip({ r, heard, locked, big, onPatch }: { r: MixRelay; heard: boolean; locked: boolean; big: boolean; onPatch: (p: Patch) => void }) {
  const on = isOn(r);
  return (
    <li className={`flex h-full shrink-0 snap-start flex-col gap-1.5 rounded-lg border border-line bg-background p-1.5 ${big ? "w-[7.5rem]" : "w-[5.75rem]"} ${on ? "" : "opacity-60"}`}>
      <p className="flex items-center gap-1.5 truncate font-mono text-[10px] font-semibold tracking-wider" title={`${r.name}${on ? "" : " (hors ligne)"}`}>
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={on ? { background: camColor(r.n) } : { border: "1px solid var(--muted)" }} />
        <span className="truncate">CAM {r.n}</span>
      </p>
      <div className="flex min-h-0 flex-1 items-stretch justify-center gap-1">
        <LevelMeter active={heard} scale seed={r.n * 2.3} hot={r.status === "unstable"} barWidth={big ? 7 : 5} className="shrink-0" label={`Niveau ${r.name}`} />
        <Fader db={r.volume} onChange={(volume) => onPatch({ volume })} disabled={locked} label={r.name} wide={big} />
      </div>
      <p className="text-center font-mono text-[10px] tabular-nums text-muted">{fmtDb(r.volume)} dB</p>
      <div className="flex justify-center gap-1">
        <Btn big={big} disabled={locked} on={r.mute} tone="border-live bg-live text-on-accent" onClick={() => onPatch({ mute: !r.mute })} title="Muet">M</Btn>
        <Btn big={big} disabled={locked} on={r.solo} tone="border-yellow-400 bg-yellow-400 text-background" onClick={() => onPatch({ solo: !r.solo })} title="Solo">S</Btn>
        <Btn big={big} disabled={locked} on={r.afv} tone="border-emerald-500 bg-emerald-600 text-on-accent" onClick={() => onPatch({ afv: !r.afv })} title="AFV : le son suit la caméra au PROGRAMME">AFV</Btn>
      </div>
    </li>
  );
}

function Master({ db, onDb, mute, onMute, locked, big }: { db: number; onDb: (v: number) => void; mute: boolean; onMute: () => void; locked: boolean; big: boolean }) {
  const [lufs, setLufs] = useState(-23.4);
  const [lim, setLim] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setLufs(-23 + (Math.random() - 0.5) * 3 + db * 0.6);
      setLim(db > 0 || Math.random() < 0.08);
    }, 700);
    return () => clearInterval(t);
  }, [db]);
  return (
    <div className={`flex h-full shrink-0 flex-col gap-1.5 rounded-lg border border-line-strong bg-background p-1.5 ${big ? "w-[8.5rem]" : "w-[8rem]"}`}>
      <p className="font-mono text-[10px] font-semibold tracking-wider">MASTER</p>
      <div className="flex min-h-0 flex-1 items-stretch justify-center gap-1.5">
        <LevelMeter active={!mute} scale hot seed={99} barWidth={big ? 9 : 7} className="shrink-0" label="Niveau master" />
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

export default function AudioMixer({ relays, program, locked, master, onMaster, masterMute, onMasterMute, onPatch, big = false, className = "" }: {
  relays: MixRelay[];
  program: string;
  locked: boolean;
  master: number;
  onMaster: (db: number) => void;
  masterMute: boolean;
  onMasterMute: () => void;
  onPatch: (id: string, patch: Patch) => void;
  /** Mobile : faders et boutons larges (cibles tactiles de 44 px ou plus). */
  big?: boolean;
  className?: string;
}) {
  const soloOn = relays.some((r) => r.solo);
  return (
    <section aria-label="Mixeur audio" className={`flex min-h-0 gap-2 rounded-xl border border-line bg-surface p-1.5 ${className}`}>
      <div className="flex w-5 shrink-0 flex-col items-center justify-between py-1 text-muted">
        <span className="font-mono text-[9px] font-semibold tracking-[0.16em] [writing-mode:vertical-rl] rotate-180">AUDIO</span>
        {locked && <Lock size={12} weight="fill" aria-label="Verrouillé par la protection" />}
      </div>
      <ul className="flex min-w-0 flex-1 snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain">
        {[...relays].sort((a, b) => a.n - b.n).map((r) => {
          const heard = isOn(r) && !r.mute && (!soloOn || r.solo) && (!r.afv || r.id === program);
          return <Strip key={r.id} r={r} heard={heard} locked={locked} big={big} onPatch={(p) => onPatch(r.id, p)} />;
        })}
      </ul>
      <Master db={master} onDb={onMaster} mute={masterMute} onMute={onMasterMute} locked={locked} big={big} />
    </section>
  );
}
