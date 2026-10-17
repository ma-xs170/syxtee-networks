"use client";

import { useEffect } from "react";
import { Card, DkButton } from "../dashboard/kit";
import ProgramView from "./ProgramView";
import { cx, dbToPct, Icon } from "./ui";
import type { Obs } from "./useObs";
import type { Mix } from "./types";

// Direct, grand écran, version simple : aperçu, puis Scènes > Sources > Mixage > Outils (l'ordre d'OBS).
// Toutes les actions agissent sur le vrai OBS ; la vue complète (entrées, destinations, enregistrement) reste en « Vue avancée ».
// Raccourcis : 1 à 9 changent de scène, M coupe le premier micro.

const fmtDb = (db: number) => (Number.isFinite(db) && db > -100 ? db.toFixed(1).replace(".", ",") : "-inf");

function Strip({ o, m }: { o: Obs; m: Mix }) {
  const level = o.levels[m.name] ?? -100;
  const value = Number.isFinite(m.db) ? Math.max(-60, Math.min(0, m.db)) : -60;
  const edit = o.ready && o.canScenes;
  return (
    <li className="flex w-20 flex-col items-center gap-3">
      <span className="dk-mono text-[12px] text-muted">{m.muted ? "Muet" : fmtDb(m.db)}</span>
      <div className="flex h-40 items-stretch gap-2">
        <div role="meter" aria-label={`Niveau ${m.name}`} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={Math.round(Math.max(-60, level))} className="relative w-1.5 overflow-hidden rounded-full bg-foreground/15">
          <div className="absolute inset-x-0 bottom-0 rounded-full" style={{ height: `${m.muted ? 0 : dbToPct(level)}%`, background: "linear-gradient(to top, var(--dk-green) 75%, var(--dk-amber))" }} />
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
          className="h-full w-5 cursor-pointer disabled:opacity-40"
          style={{ writingMode: "vertical-lr", direction: "rtl", accentColor: "var(--dk-blue)" }}
        />
      </div>
      <button
        type="button"
        disabled={!edit}
        aria-pressed={m.muted}
        aria-label={`${m.muted ? "Réactiver" : "Couper"} ${m.name}`}
        onClick={() => o.toggleMute(m.name)}
        className="grid size-10 place-items-center rounded-lg border disabled:opacity-40"
        style={m.muted ? { borderColor: "var(--dk-red)", background: "color-mix(in srgb, var(--dk-red) 12%, transparent)", color: "var(--dk-red)" } : { borderColor: "var(--line-strong)" }}
      >
        <Icon name={m.muted ? "mic-off" : "mic"} />
      </button>
      <span className="w-full truncate text-center text-[13px] text-muted" title={m.name}>{m.name}</span>
    </li>
  );
}

export default function DirectSimple({ o, onLive, onAdvanced }: { o: Obs; onLive: () => void; onAdvanced: () => void }) {
  const off = !o.ready || !o.canLive;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable]")) return;
      if (/^[1-9]$/.test(e.key) && o.ready && o.canScenes) {
        const sc = o.scenes[Number(e.key) - 1];
        if (sc) o.pick(sc);
      } else if (e.key.toLowerCase() === "m" && o.ready && o.canScenes) {
        const mic = o.visibleMixer.find((x) => /micro|mic/i.test(x.name)) ?? o.visibleMixer[0];
        if (mic) o.toggleMute(mic.name);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [o]);

  return (
    <div className="mx-auto grid w-full max-w-[1480px] gap-8 px-6 py-8">
      <div className="mx-auto w-full max-w-[880px]">
        <ProgramView o={o} ratio className="!rounded-2xl" />
        <p className="mt-3 flex items-center justify-between gap-4 text-[14px] text-muted">
          <span>Scène active : <span className="text-foreground">{o.program || "-"}</span></span>
          <span className="dk-mono">{o.streaming && o.stats?.kbps != null ? `${o.stats.kbps} kbit/s` : o.latency != null ? `${o.latency} ms` : ""}</span>
        </p>
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="min-h-[26rem]">
          <h2 className="dk-label mb-4">Scènes</h2>
          {o.scenes.length === 0 ? (
            <p className="text-[14px] text-muted">{o.ready ? "Aucune scène." : "En attente d'OBS…"}</p>
          ) : (
            <ul className="grid gap-1">
              {o.scenes.map((sc) => {
                const on = sc === o.program;
                return (
                  <li key={sc}>
                    <button type="button" disabled={!o.ready || !o.canScenes} aria-pressed={on} onClick={() => o.pick(sc)} className={cx("flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14px] disabled:opacity-50", on ? "bg-foreground/10 text-foreground" : "text-foreground/80 hover:bg-foreground/[0.06]")}>
                      <span className="min-w-0 flex-1 truncate">{sc}</span>
                      {on && <span aria-hidden="true" className="size-2 rounded-full" style={{ background: "var(--dk-green)" }} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="min-h-[26rem]">
          <h2 className="dk-label mb-4">Sources</h2>
          {o.items.length === 0 ? (
            <p className="text-[14px] text-muted">{o.ready ? "Aucune source dans cette scène." : "En attente d'OBS…"}</p>
          ) : (
            <ul className="grid gap-1">
              {o.items.map((i) => (
                <li key={i.id} className="flex h-11 items-center gap-3 rounded-[10px] px-3">
                  <span className={cx("min-w-0 flex-1 truncate text-[14px]", !i.on && "text-muted")}>{i.name}</span>
                  <button type="button" role="switch" aria-checked={i.on} aria-label={`${i.name} : ${i.on ? "visible" : "masquée"}`} disabled={off} onClick={() => o.toggleItem(i)} className={cx("grid size-9 place-items-center rounded-lg hover:bg-foreground/10 disabled:opacity-40", i.on ? "text-foreground" : "text-muted")}>
                    <Icon name={i.on ? "eye" : "eye-off"} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-h-[26rem]">
          <h2 className="dk-label mb-4">Mixage</h2>
          {o.visibleMixer.length === 0 ? (
            <p className="text-[14px] text-muted">{o.ready ? "Aucune source audio." : "En attente d'OBS…"}</p>
          ) : (
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-8">
              {o.visibleMixer.map((m) => (
                <Strip key={m.name} o={o} m={m} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-h-[26rem]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="dk-label">Outils</h2>
            <span className="dk-mono text-[12px]" style={{ color: o.streaming ? "var(--dk-red)" : undefined }}>{o.streaming ? "En direct" : "Prêt"}</span>
          </div>
          <div className="grid justify-items-center gap-3 py-2">
            <DkButton tone={o.streaming ? "danger" : "primary"} className="!h-11 !w-full max-w-[17rem] !rounded-full !px-6 font-semibold" disabled={off || o.streamBusy} onClick={onLive}>
              {o.streamBusy ? (o.streaming ? "Arrêt…" : "Démarrage…") : o.streaming ? "Terminer le stream" : "Commencer le streaming"}
            </DkButton>
            <DkButton className="!h-11 !w-full max-w-[17rem] !rounded-full !px-6" aria-pressed={o.recording} disabled={off || o.recBusy} onClick={o.toggleRecord} style={o.recording ? { borderColor: "var(--dk-red)", background: "color-mix(in srgb, var(--dk-red) 14%, transparent)", color: "var(--dk-red)" } : undefined}>
              <span aria-hidden="true" className="size-2 rounded-full" style={{ background: o.recording ? "var(--dk-red)" : "var(--faint)" }} />
              {o.recording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
            </DkButton>
            <DkButton className="!h-11 !w-full max-w-[17rem] !rounded-full !px-6" aria-pressed={o.studioMode} disabled={off} onClick={o.toggleStudio} style={o.studioMode ? { borderColor: "var(--dk-blue)", background: "color-mix(in srgb, var(--dk-blue) 14%, transparent)" } : undefined}>
              Mode Studio
            </DkButton>
          </div>
        </Card>
      </div>

      <p className="text-center text-[13px] text-muted">
        <button type="button" onClick={onAdvanced} className="underline underline-offset-4 hover:text-foreground">Vue avancée</button>
        <span className="mx-2" aria-hidden="true">·</span>1 à 9 : scènes · M : micro
      </p>
    </div>
  );
}
