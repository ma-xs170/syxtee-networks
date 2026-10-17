"use client";

import { useEffect, type ReactNode } from "react";
import { DkButton } from "../dashboard/kit";
import ProgramView from "./ProgramView";
import { cx, dbToPct, Icon, KindIcon, kindLabel } from "./ui";
import type { Obs } from "./useObs";
import type { Mix } from "./types";

// Direct, grand écran : la disposition d'OBS Studio sur une page, sans défilement.
// Aperçu du programme (profil, collection, flux et Mode Studio sont dans la barre du haut), puis quatre docks en bas :
// Scènes, Sources, Mixer audio (colonnes verticales), Contrôles + Flux. Tout agit sur le vrai OBS du poste.
// Raccourcis : 1 à 9 changent de scène, M coupe le micro.

const fmtDb = (db: number) => (Number.isFinite(db) && db > -100 ? db.toFixed(1).replace(".", ",") : "-inf");
const fmtInt = (n: number) => n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");


function Dock({ title, aside, className, children }: { title: string; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={cx("dk-card flex min-h-0 min-w-0 flex-col !p-0", className)}>
      <h2 className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-4 text-[13px] font-semibold">
        {title}
        {aside && <span className="min-w-0 truncate font-normal text-muted">{aside}</span>}
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">{children}</div>
    </section>
  );
}

function Strip({ o, m }: { o: Obs; m: Mix }) {
  const level = o.levels[m.name] ?? -100;
  const value = Number.isFinite(m.db) ? Math.max(-60, Math.min(0, m.db)) : -60;
  const edit = o.ready && o.canScenes;
  return (
    <li className="flex h-full w-[5.5rem] shrink-0 flex-col items-center gap-2 rounded-xl border border-line px-2 py-3">
      <span className="w-full truncate text-center text-[12px] font-medium" title={m.name}>{m.name}</span>
      <div className="flex min-h-0 flex-1 items-stretch gap-2">
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
      <span className="dk-mono text-[12px] text-muted">{m.muted ? "Muet" : fmtDb(m.db)}</span>
      <button
        type="button"
        disabled={!edit}
        aria-pressed={m.muted}
        aria-label={`${m.muted ? "Réactiver" : "Couper"} ${m.name}`}
        onClick={() => o.toggleMute(m.name)}
        className="grid size-9 place-items-center rounded-lg border disabled:opacity-40"
        style={m.muted ? { borderColor: "var(--dk-red)", background: "color-mix(in srgb, var(--dk-red) 14%, transparent)", color: "var(--dk-red)" } : { borderColor: "var(--line-strong)" }}
      >
        <Icon name={m.muted ? "mic-off" : "mic"} />
      </button>
    </li>
  );
}

export default function DirectSimple({ o, onLive }: { o: Obs; onLive: () => void }) {
  const off = !o.ready || !o.canLive;
  const s = o.stats;
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
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(20rem,42%)] gap-3 p-3">
      <ProgramView o={o} className="!rounded-2xl" />

      <div className="grid min-h-0 gap-3 [grid-template-columns:minmax(11rem,0.9fr)_minmax(0,1.5fr)_minmax(0,2fr)_minmax(14rem,1.1fr)]">
        <Dock title="Scènes" aside={o.scenes.length}>
          {o.scenes.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-muted">{o.ready ? "Aucune scène." : "En attente d'OBS…"}</p>
          ) : (
            <ul className="grid gap-1">
              {o.scenes.map((sc) => {
                const on = sc === o.program;
                return (
                  <li key={sc}>
                    <button type="button" disabled={!o.ready || !o.canScenes} aria-pressed={on} onClick={() => o.pick(sc)} className={cx("flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13px] disabled:opacity-50", on ? "bg-foreground/10 font-medium text-foreground" : "text-foreground/80 hover:bg-foreground/[0.06]")}>
                      {on && o.streaming ? <span aria-hidden="true" className="live-dot shrink-0" /> : <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={on ? { background: "var(--dk-green)" } : { border: "1px solid var(--faint)" }} />}
                      <span className="min-w-0 flex-1 truncate">{sc}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Dock>

        <Dock title="Sources" aside={o.editing}>
          {o.items.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-muted">{o.ready ? "Aucune source dans cette scène." : "En attente d'OBS…"}</p>
          ) : (
            <ul className="grid gap-0.5">
              {o.items.map((i) => (
                <li key={i.id} className="flex h-9 items-center gap-2.5 rounded-lg px-3">
                  <KindIcon kind={i.kind} />
                  <span className={cx("min-w-0 flex-1 truncate text-[13px]", !i.on && "text-muted line-through")}>{i.name}</span>
                  <span className="hidden shrink-0 text-[12px] text-muted 2xl:inline">{kindLabel(i.kind)}</span>
                  <button type="button" role="switch" aria-checked={i.on} aria-label={`${i.name} : ${i.on ? "visible" : "masquée"}`} disabled={off} onClick={() => o.toggleItem(i)} className={cx("grid size-8 shrink-0 place-items-center rounded-lg hover:bg-foreground/10 disabled:opacity-40", i.on ? "text-foreground" : "text-muted")}>
                    <Icon name={i.on ? "eye" : "eye-off"} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Dock>

        <Dock title="Mixer audio">
          {o.visibleMixer.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-muted">{o.ready ? "Aucune source audio dans cette scène." : "En attente d'OBS…"}</p>
          ) : (
            <ul className="flex h-full gap-2">
              {o.visibleMixer.map((m) => (
                <Strip key={m.name} o={o} m={m} />
              ))}
            </ul>
          )}
        </Dock>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
          <Dock title="Contrôles" aside={o.streaming ? "En direct" : "Prêt"}>
            <div className="grid gap-2">
              <DkButton tone={o.streaming ? "danger" : "primary"} className="!h-10 !w-full" disabled={off || o.streamBusy} onClick={onLive}>
                {o.streamBusy ? (o.streaming ? "Arrêt…" : "Démarrage…") : o.streaming ? "Terminer le stream" : "Commencer le streaming"}
              </DkButton>
              <DkButton className="!h-10 !w-full" aria-pressed={o.recording} disabled={off || o.recBusy} onClick={o.toggleRecord} style={o.recording ? { borderColor: "var(--dk-red)", background: "color-mix(in srgb, var(--dk-red) 14%, transparent)", color: "var(--dk-red)" } : undefined}>
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: o.recording ? "var(--dk-red)" : "var(--faint)" }} />
                {o.recording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
              </DkButton>
            </div>
          </Dock>
          <Dock title="Flux">
            <p className="dk-mono px-2 pt-1 text-[22px] text-foreground">{o.streaming && s?.kbps != null ? `${fmtInt(s.kbps)} kbit/s` : "-"}</p>
          </Dock>
        </div>
      </div>
    </div>
  );
}
