"use client";

import { useEffect, type ReactNode } from "react";
import { DkButton } from "../dashboard/kit";
import ProgramView from "./ProgramView";
import { cx, dbToPct, Icon, KindIcon, kindLabel } from "./ui";
import { MON_OFF, type Obs } from "./useObs";
import type { Mix } from "./types";

// Direct, grand écran : la disposition d'OBS Studio sur une page, sans défilement.
// Aperçu du programme (profil, collection, flux et Mode Studio sont dans la barre du haut), puis quatre docks en bas :
// Scènes, Sources, Mixer audio (colonnes verticales), Contrôles + Flux. Tout agit sur le vrai OBS du poste.
// Raccourcis : 1 à 9 changent de scène, M coupe le micro.

/** Jauge : dégradé vert, orange puis rouge vers le haut. Rien n'est coloré tant que la source ne fait pas de bruit ; la gamme reste visible en teinte sombre. */
const METER = "linear-gradient(to top, var(--dk-green) 0%, var(--dk-green) 55%, var(--dk-amber) 80%, var(--dk-red) 100%)";

/** Fader d'OBS : position = racine cubique de l'amplitude, soit dB = 60 × log10(position). -60 dB est à 10 % de la hauteur (pas tout en bas), 0 dB tout en haut, -inf en bas. */
const FADER_MAX = 1000;
const dbToFader = (db: number) => (!Number.isFinite(db) || db <= -100 ? 0 : Math.round(Math.min(1, Math.pow(10, db / 60)) * FADER_MAX));
const faderToDb = (pos: number) => (pos <= 0 ? -100 : Math.round(60 * Math.log10(pos / FADER_MAX) * 10) / 10);

/** Une barre de niveau (un canal). */
function Bar({ db, muted, label }: { db: number; muted: boolean; label: string }) {
  return (
    <div role="meter" aria-label={label} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={Math.round(Math.max(-60, db))} className="relative w-1 overflow-hidden rounded-[1px]">
      <div className="absolute inset-0 opacity-[0.18]" style={{ background: METER }} />
      <div className="absolute inset-0" style={{ background: METER, clipPath: `inset(${100 - (muted ? 0 : dbToPct(db))}% 0 0 0)` }} />
    </div>
  );
}
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
  const mono = o.levels[m.name] ?? -100;
  const [left, right] = o.levelsLR[m.name] ?? [mono, mono];
  const value = dbToFader(m.db);
  const edit = o.ready && o.canScenes;
  const listening = m.mon !== MON_OFF;
  return (
    <li className="flex h-full w-[5.75rem] shrink-0 flex-col items-center gap-2 rounded-xl border border-line px-2 py-3">
      <span className="w-full truncate text-center text-[12px] font-medium" title={m.name}>{m.name}</span>
      <div className="flex min-h-0 flex-1 items-stretch gap-2">
        <div className="flex gap-0.5">
          <Bar db={left} muted={m.muted} label={`Niveau gauche ${m.name}`} />
          <Bar db={right} muted={m.muted} label={`Niveau droit ${m.name}`} />
        </div>
        <input
          type="range"
          min={0}
          max={FADER_MAX}
          step={1}
          value={value}
          disabled={!edit}
          aria-label={`Volume ${m.name}`}
          aria-valuetext={`${fmtDb(m.db)} décibels`}
          onChange={(e) => o.setVolume(m.name, faderToDb(Number(e.target.value)))}
          onPointerDown={() => o.dragVolume(m.name, true)}
          onPointerUp={() => o.dragVolume(m.name, false)}
          onPointerCancel={() => o.dragVolume(m.name, false)}
          onBlur={() => o.dragVolume(m.name, false)}
          onDoubleClick={() => o.setVolume(m.name, 0)}
          className="mx-fader h-full"
          style={{ ["--fill" as string]: `${(value / FADER_MAX) * 100}%` }}
        />
      </div>
      <span className="dk-mono text-[12px] text-muted">{fmtDb(m.db)}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!edit}
          aria-pressed={m.muted}
          aria-label={`${m.muted ? "Réactiver" : "Couper"} ${m.name}`}
          title={m.muted ? "Réactiver le son" : "Couper le son"}
          onClick={() => o.toggleMute(m.name)}
          className="grid size-8 place-items-center rounded-md border disabled:opacity-40"
          style={m.muted ? { borderColor: "var(--dk-red)", background: "color-mix(in srgb, var(--dk-red) 14%, transparent)", color: "var(--dk-red)" } : { borderColor: "var(--line-strong)" }}
        >
          <Icon name={m.muted ? "mic-off" : "mic"} />
        </button>
        <button
          type="button"
          disabled={!edit}
          aria-pressed={listening}
          aria-label={`Pré-écoute de ${m.name}`}
          title={listening ? "Arrêter la pré-écoute sur le PC" : "Pré-écoute : entendre cette piste sur le PC"}
          onClick={() => o.toggleMonitor(m.name)}
          className="grid size-8 place-items-center rounded-md border disabled:opacity-40"
          style={listening ? { borderColor: "var(--foreground)", background: "color-mix(in srgb, var(--foreground) 14%, transparent)" } : { borderColor: "var(--line-strong)" }}
        >
          <Icon name={listening ? "headphones" : "headphones-off"} />
        </button>
      </div>
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
