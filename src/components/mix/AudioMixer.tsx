"use client";

import { Vu } from "./parts";
import { isOn, type MixRelay } from "@/lib/mix-sim";

// Mixeur audio : une voie par relais (fader en dB, mute, solo, AFV « audio suit l'image », VU L/R) et un master avec limiteur.
// Maquette : les niveaux et le limiteur sont simulés ; le mixage réel se fera côté serveur (FFmpeg).

const DB_MIN = -60;
const DB_MAX = 6;

const FADER = { writingMode: "vertical-lr", direction: "rtl" } as React.CSSProperties;

function Strip({ label, sub, db, onDb, active, locked, children }: { label: string; sub?: string; db: number; onDb: (v: number) => void; active: boolean; locked: boolean; children?: React.ReactNode }) {
  return (
    <li className="flex w-[4.75rem] shrink-0 flex-col items-center gap-2 rounded-xl border border-line bg-background px-2 py-3">
      <p className="w-full truncate text-center font-mono text-[11px] font-semibold tracking-wider" title={sub}>
        {label}
      </p>
      <div className="flex h-36 items-stretch gap-2">
        <Vu active={active} vertical level={0.7} />
        <input
          type="range"
          min={DB_MIN}
          max={DB_MAX}
          step={1}
          value={db}
          disabled={locked}
          onChange={(e) => onDb(Number(e.target.value))}
          style={FADER}
          aria-label={`Volume ${label}`}
          className="h-full w-4 accent-[var(--foreground)] disabled:opacity-40"
        />
      </div>
      <p className="font-mono text-[11px] tabular-nums text-muted">{db > DB_MIN ? `${db > 0 ? "+" : ""}${db} dB` : "−∞"}</p>
      {children}
    </li>
  );
}

export default function AudioMixer({ relays, program, locked, master, onMaster, onPatch }: {
  relays: MixRelay[];
  program: string;
  locked: boolean;
  master: number;
  onMaster: (db: number) => void;
  onPatch: (id: string, patch: Partial<Pick<MixRelay, "volume" | "mute" | "solo" | "afv">>) => void;
}) {
  const soloOn = relays.some((r) => r.solo);
  const btn = (on: boolean, tone: string) =>
    `h-8 w-8 rounded-md border font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40 ${on ? tone : "border-line text-muted hover:text-foreground"}`;

  return (
    <section aria-label="Mixeur audio" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Mixeur audio</h2>
        <p className="font-mono text-[10px] tracking-[0.14em] text-muted">LIMITEUR ACTIF</p>
      </div>
      <ul className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {[...relays].sort((a, b) => a.n - b.n).map((r) => {
          const on = isOn(r);
          const heard = on && !r.mute && (!soloOn || r.solo) && (!r.afv || r.id === program);
          return (
            <Strip key={r.id} label={`CAM ${r.n}`} sub={r.name} db={r.volume} onDb={(v) => onPatch(r.id, { volume: v })} active={heard} locked={locked}>
              <div className="flex gap-1">
                <button type="button" disabled={locked} aria-pressed={r.mute} onClick={() => onPatch(r.id, { mute: !r.mute })} className={btn(r.mute, "border-live bg-live text-on-accent")} title="Muet">
                  M
                </button>
                <button type="button" disabled={locked} aria-pressed={r.solo} onClick={() => onPatch(r.id, { solo: !r.solo })} className={btn(r.solo, "border-orange-400 bg-orange-400 text-background")} title="Solo">
                  S
                </button>
              </div>
              <button type="button" disabled={locked} aria-pressed={r.afv} onClick={() => onPatch(r.id, { afv: !r.afv })} className={`${btn(r.afv, "border-emerald-500 bg-emerald-600 text-on-accent")} h-7 w-full`} title="Audio suit l'image : n'est entendue que quand la caméra est au PROGRAM">
                AFV
              </button>
            </Strip>
          );
        })}
        <li className="ml-auto" aria-hidden="true" />
        <Strip label="MASTER" db={master} onDb={onMaster} active locked={locked}>
          <p className="rounded-md border border-line px-2 py-1 font-mono text-[10px] tracking-wider text-muted">LIM −1 dB</p>
        </Strip>
      </ul>
    </section>
  );
}
