"use client";

import { cx, dbToPct, Icon, panel, panelHead } from "./ui";
import { MON_OFF } from "./useObs";
import type { Obs } from "./useObs";
import type { Mix } from "./types";

// Mélangeur audio : une ligne par source, avec le niveau en direct sous le curseur de volume (même échelle, -60 à 0 dB).

const fmtDb = (db: number) => (Number.isFinite(db) && db > -100 ? db.toFixed(1) : "-inf");
const levelColor = (db: number) => (db > -6 ? "bg-bad" : db > -18 ? "bg-warn" : "bg-ok");

function Strip({ o, m }: { o: Obs; m: Mix }) {
  const level = o.levels[m.name] ?? -100;
  const value = Number.isFinite(m.db) ? Math.max(-60, Math.min(0, m.db)) : -60;
  const edit = o.ready && o.canScenes;
  return (
    <li className={cx("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded-lg px-2 py-1.5", m.muted && "opacity-70")}>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-medium" title={m.name}>
            {m.name}
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{m.muted ? "coupé" : `${fmtDb(m.db)} dB`}</span>
        </div>
        <div className="relative mt-0.5 h-8">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-foreground/15" role="meter" aria-label={`Niveau ${m.name}`} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={Math.round(Math.max(-60, level))}>
            <div className={cx("h-full rounded-full", levelColor(level))} style={{ width: `${m.muted ? 0 : dbToPct(level)}%`, transition: "width 60ms linear" }} />
          </div>
          <input
            type="range"
            min={-60}
            max={0}
            step={0.5}
            value={value}
            disabled={!edit}
            aria-label={`Volume ${m.name}`}
            aria-valuetext={`${fmtDb(m.db)} décibels`}
            onChange={(e) => o.setVolume(m.name, Number(e.target.value))}
            onPointerDown={() => o.dragVolume(m.name, true)}
            onPointerUp={() => o.dragVolume(m.name, false)}
            onPointerCancel={() => o.dragVolume(m.name, false)}
            onBlur={() => o.dragVolume(m.name, false)}
            onDoubleClick={() => o.setVolume(m.name, 0)}
            className="rm-range rm-range--bare absolute inset-0"
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!edit}
          aria-pressed={m.muted}
          aria-label={`${m.muted ? "Réactiver" : "Couper"} ${m.name}`}
          title={m.muted ? "Réactiver le son" : "Couper le son"}
          onClick={() => o.toggleMute(m.name)}
          className={cx("grid size-11 place-items-center rounded-lg border transition-colors disabled:opacity-40", m.muted ? "border-live bg-live/10 text-live" : "border-line text-foreground/80 hover:bg-foreground/10")}
        >
          <Icon name={m.muted ? "mic-off" : "mic"} />
        </button>
        <button
          type="button"
          disabled={!edit}
          aria-pressed={m.mon !== MON_OFF}
          aria-label={`Écoute de ${m.name}`}
          title={m.mon === MON_OFF ? "Écouter cette piste sur le PC" : "Arrêter l'écoute"}
          onClick={() => o.toggleMonitor(m.name)}
          className={cx("grid size-11 place-items-center rounded-lg border transition-colors disabled:opacity-40", m.mon !== MON_OFF ? "border-foreground/50 bg-foreground/15" : "border-line text-foreground/80 hover:bg-foreground/10")}
        >
          <Icon name={m.mon === MON_OFF ? "headphones-off" : "headphones"} />
        </button>
      </div>
    </li>
  );
}

export default function MixerPanel({ o, className }: { o: Obs; className?: string }) {
  return (
    <section aria-label="Mélangeur audio" className={cx(panel, className)}>
      <h2 className={cx(panelHead, "justify-between")}>
        Mélangeur audio
        <button
          type="button"
          aria-pressed={o.meterHold}
          aria-label={o.meterHold ? "Reprendre les niveaux" : "Figer les niveaux"}
          title={o.meterHold ? "Reprendre les niveaux" : "Figer les niveaux"}
          onClick={() => o.setMeterHold(!o.meterHold)}
          className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <Icon name={o.meterHold ? "play" : "pause"} className="size-4" />
        </button>
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {o.visibleMixer.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted">{o.ready ? (o.loaded ? "Aucune source audio dans cette scène." : "Chargement…") : "En attente d'OBS…"}</p>
        ) : (
          <ul className="grid gap-0.5">
            {o.visibleMixer.map((m) => (
              <Strip key={m.name} o={o} m={m} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
