"use client";

import { LiveExtras } from "./EditTools";
import { btn, btnLive, btnPrimary, clock, cx, Icon, panel, panelHead, Select, Switch } from "./ui";
import type { Obs } from "./useObs";

// Direct : départ/arrêt du stream, enregistrement, Mode Studio, mesures du poste, débit à chaud et replay.

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className={cx("mt-0.5 font-mono text-sm tabular-nums", warn && "text-warn")}>{value}</p>
    </div>
  );
}

export default function LivePanel({ o, onLive, onSettings, className }: { o: Obs; onLive: () => void; onSettings: () => void; className?: string }) {
  const s = o.stats;
  const off = !o.ready || !o.canLive;
  const lossPct = s && s.total > 0 ? (s.dropped / s.total) * 100 : 0;
  return (
    <div className={cx("flex min-h-0 min-w-0 flex-col gap-2 overflow-y-auto overscroll-contain", className)}>
      <section aria-label="Commandes" className={cx(panel, "shrink-0")}>
        <h2 className={cx(panelHead, "lg:hidden")}>Direct</h2>
        <div className="grid gap-2 p-2.5">
          <button type="button" disabled={off || o.streamBusy} onClick={onLive} className={cx(o.streaming ? btnLive("lg") : btnPrimary("lg"), "w-full")}>
            {o.streaming ? <span aria-hidden="true" className="live-dot" /> : <Icon name="live" />}
            {o.streamBusy ? (o.streaming ? "Arrêt en cours…" : "Démarrage…") : o.streaming ? <>Arrêter le direct · <span className="font-mono tabular-nums">{clock(s?.streamMs ?? 0)}</span></> : "Passer en direct"}
          </button>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <button type="button" disabled={off || o.recBusy} onClick={o.toggleRecord} className={cx(o.recording ? btnLive() : btn(), "w-full")}>
              <Icon name="record" className={cx("size-4", o.recording && "fill-current")} />
              {o.recBusy ? "…" : o.recording ? <>Arrêter l&apos;enregistrement · <span className="font-mono tabular-nums">{clock(s?.recMs ?? 0)}</span></> : "Enregistrer"}
            </button>
            {o.recording && (
              <button type="button" disabled={off} onClick={o.togglePause} className={btn()} aria-label={o.paused ? "Reprendre l'enregistrement" : "Mettre l'enregistrement en pause"}>
                <Icon name={o.paused ? "play" : "pause"} />
                <span className="max-sm:sr-only">{o.paused ? "Reprendre" : "Pause"}</span>
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">Mode Studio</p>
              <p className="text-[13px] text-muted">Prépare une scène en aperçu, puis envoie-la.</p>
            </div>
            <Switch label="Mode Studio" on={o.studioMode} disabled={!o.ready || !o.canScenes} onClick={o.toggleStudio} />
          </div>
          {o.owner && (
            <button type="button" disabled={!o.ready} onClick={onSettings} className={cx(btn(), "w-full")}>
              <Icon name="gear" />
              Paramètres d&apos;OBS
            </button>
          )}
        </div>
      </section>

      {!o.guest && (
        <section aria-label="Profil et collection" className={cx(panel, "shrink-0 gap-3 p-2.5 lg:hidden")}>
          <Select label="Profil OBS" value={o.profiles.current} options={o.profiles.list} placeholder={null} disabled={!o.ready || !o.canLive || o.profiles.list.length === 0} onChange={o.setProfile} />
          <Select label="Collection de scènes" value={o.collections.current} options={o.collections.list} placeholder={null} disabled={!o.ready || !o.canLive || o.collections.list.length === 0} onChange={o.setCollection} />
        </section>
      )}

      <section aria-label="Mesures du poste" className={cx(panel, "shrink-0 p-2.5 lg:hidden")}>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Débit" value={o.streaming && s?.kbps != null ? `${s.kbps} kbit/s` : "—"} />
          <Stat label="Processeur" value={s ? `${s.cpu} %` : "—"} warn={!!s && s.cpu > 85} />
          <Stat label="Images/s" value={s ? String(s.fps) : "—"} />
          <Stat label="Images perdues" value={o.streaming && s ? `${lossPct.toFixed(1)} %` : "—"} warn={lossPct > 2} />
        </div>
        {o.streaming && s?.encoder && <p className="mt-2 truncate px-1 font-mono text-xs text-muted" title={s.encoder}>{s.encoder}</p>}
        {o.streaming && s && s.congestion > 0.3 && (
          <p role="alert" className="mt-2 flex items-center gap-2 px-1 text-[13px] text-warn">
            <Icon name="alert" className="size-4" />
            Réseau du PC saturé.
          </p>
        )}
      </section>

      {o.ready && <LiveExtras call={o.call} streaming={o.streaming} canEdit={o.canLive} />}
    </div>
  );
}
