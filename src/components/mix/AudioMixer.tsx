"use client";

import { Vu } from "./parts";
import { isOn, type MixRelay } from "@/lib/mix-sim";

// Mixeur audio en bandeau horizontal : une voie étroite par relais (fader court en dB, mute, solo, AFV « audio suit l'image »,
// VU L/R) et le master collé à droite. Maquette : niveaux et limiteur simulés ; le vrai mixage se fera côté serveur.

const DB_MIN = -60;
const DB_MAX = 6;
const FADER = { writingMode: "vertical-lr", direction: "rtl" } as React.CSSProperties;

function Strip({ label, sub, db, onDb, active, locked, children }: { label: string; sub?: string; db: number; onDb: (v: number) => void; active: boolean; locked: boolean; children?: React.ReactNode }) {
  return (
    <li className="flex min-w-14 max-w-24 flex-1 flex-col items-center gap-1 rounded-md border border-line bg-background px-1 py-1">
      <p className="w-full truncate text-center font-mono text-[10px] font-semibold tracking-wider" title={sub}>
        {label}
      </p>
      <div className="flex h-10 items-stretch gap-1.5">
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
          className="h-full w-3.5 accent-[var(--foreground)] disabled:opacity-40"
        />
      </div>
      <p className="font-mono text-[10px] tabular-nums text-muted">{db > DB_MIN ? `${db > 0 ? "+" : ""}${db}` : "−∞"}</p>
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
    `h-5 w-5 rounded border font-mono text-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40 ${on ? tone : "border-line text-muted hover:text-foreground"}`;

  return (
    <section aria-label="Mixeur audio" className="flex items-stretch gap-2 rounded-xl border border-line bg-surface p-1.5">
      <h2 className="flex w-10 shrink-0 items-center justify-center font-mono text-[10px] font-semibold tracking-[0.16em] text-muted [writing-mode:vertical-rl] rotate-180">AUDIO</h2>
      <ul className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {[...relays].sort((a, b) => a.n - b.n).map((r) => {
          const on = isOn(r);
          const heard = on && !r.mute && (!soloOn || r.solo) && (!r.afv || r.id === program);
          return (
            <Strip key={r.id} label={`CAM ${r.n}`} sub={r.name} db={r.volume} onDb={(v) => onPatch(r.id, { volume: v })} active={heard} locked={locked}>
              <div className="flex gap-0.5">
                <button type="button" disabled={locked} aria-pressed={r.mute} onClick={() => onPatch(r.id, { mute: !r.mute })} className={btn(r.mute, "border-live bg-live text-on-accent")} title="Muet">
                  M
                </button>
                <button type="button" disabled={locked} aria-pressed={r.solo} onClick={() => onPatch(r.id, { solo: !r.solo })} className={btn(r.solo, "border-orange-400 bg-orange-400 text-background")} title="Solo">
                  S
                </button>
                <button type="button" disabled={locked} aria-pressed={r.afv} onClick={() => onPatch(r.id, { afv: !r.afv })} className={btn(r.afv, "border-emerald-500 bg-emerald-600 text-on-accent")} title="Audio suit l'image : entendue seulement quand la caméra est au PROGRAMME">
                  A
                </button>
              </div>
            </Strip>
          );
        })}
      </ul>
      <ul className="flex w-16 shrink-0">
        <Strip label="MASTER" db={master} onDb={onMaster} active locked={locked}>
          <p className="font-mono text-[9px] tracking-wider text-muted">LIM −1</p>
        </Strip>
      </ul>
    </section>
  );
}
