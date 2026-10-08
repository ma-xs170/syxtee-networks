"use client";

import { useState } from "react";
import { clock, LivePreview, SCENES, type Ctl, type SceneId } from "./ObsScreens";

// Démo d'accueil : la console du Contrôle à distance reproduite à l'identique (src/components/remote/RemoteObs.tsx) :
// mêmes classes, mêmes panneaux (Scènes, Sources, Mixer audio, Contrôles, Flux, Multistream), même palette (noir doux, filets blancs à 8 %, scène du programme en blanc translucide).
// Ordinateur 1280 x 800 : la page en plein écran. Téléphone 390 x 844 : panneaux en onglets. Montre : télécommande réduite.
// Une même session synchronisée (scène, micro, direct). Réduit par le composant Device : tailles en pixels.

const panel = "flex min-h-0 min-w-0 flex-col rounded-xl border border-white/[0.08] bg-[#0b0b0d] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
const panelTitle = "flex items-baseline gap-2 border-b border-white/[0.08] px-3.5 py-2.5 text-[13px] font-semibold tracking-tight";
const flat = "inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] text-[13px] text-neutral-100";
const field = "inline-flex h-7 items-center rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[13px] text-neutral-100";

const sceneLabel = (id: SceneId) => (SCENES.find((s) => s.id === id)?.name ?? "").toUpperCase();
const SOURCES: [string, string, boolean, string][] = [
  ["Flux › IPHONE 16", "Flux SYXTEE", true, "media"],
  ["Chat en direct", "Navigateur", true, "browser"],
  ["Caméra salon", "Caméra", false, "media"],
  ["Overlay alertes", "Navigateur", true, "browser"],
];
const MIX: { name: string; db: number; seed: number }[] = [
  { name: "Micro", db: -9, seed: 1 },
  { name: "Flux IPHONE 16", db: -14, seed: 2 },
  { name: "Musique", db: -22, seed: 3 },
];

const Svg = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const Eye = ({ on }: { on: boolean }) => (
  <Svg>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" className={on ? "" : "opacity-40"} />
    <circle cx="12" cy="12" r="3" className={on ? "" : "opacity-40"} />
    {!on && <path d="M4 4l16 16" />}
  </Svg>
);
const KindIcon = ({ kind }: { kind: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-neutral-400" aria-hidden="true">
    {kind === "browser" ? <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></> : <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M10 9.5v5l4.5-2.5L10 9.5Z" /></>}
  </svg>
);
const MicIcon = ({ off }: { off: boolean }) => (
  <Svg>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    {off && <path d="M4 4l16 16" />}
  </Svg>
);
const HeadphonesIcon = () => (
  <Svg>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3" y="14" width="4" height="6" rx="1.5" />
    <rect x="17" y="14" width="4" height="6" rx="1.5" />
  </Svg>
);

function LiveBadge({ c }: { c: Ctl }) {
  if (!c.live) return null;
  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded border border-red-700 bg-red-700/20 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-red-300">
      <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-red-500 motion-reduce:animate-none" />
      EN DIRECT {clock(c.seconds)}
    </span>
  );
}

function ScenesPanel({ c, touch = 0 }: { c: Ctl; touch?: number }) {
  return (
    <section aria-label="Scènes" className={panel}>
      <h2 className={panelTitle}>Scènes <span className="font-normal text-neutral-500">{SCENES.length}</span></h2>
      <div className="min-h-0 flex-1 overflow-hidden p-1.5">
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
          {SCENES.map((s) => {
            const on = c.scene === s.id;
            return (
              <li key={s.id}>
                <button type="button" aria-pressed={on} onClick={() => c.setScene(s.id)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] ${touch ? "min-h-12" : "min-h-9"} ${on ? "bg-white/[0.13] text-white shadow-[inset_2px_0_0_rgba(255,255,255,0.85)]" : "text-neutral-300 hover:bg-[#161616]"}`}>
                  <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${on ? "bg-white" : "bg-neutral-600"}`} />
                  <span className="min-w-0 flex-1 leading-tight">{sceneLabel(s.id)}</span>
                  {on && c.live && <span className="shrink-0 text-[12px] opacity-80">direct</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function SourcesPanel({ c }: { c: Ctl }) {
  return (
    <section aria-label="Sources de la scène" className={panel}>
      <h2 className={panelTitle}>Sources <span className="min-w-0 truncate font-normal text-neutral-500">{sceneLabel(c.scene)}</span></h2>
      <div className="min-h-0 flex-1 overflow-hidden p-1.5">
        <ul>
          {SOURCES.map(([n, k, on, kind]) => (
            <li key={n} className="flex min-h-9 items-center gap-2 rounded px-2">
              <KindIcon kind={kind} />
              <span className={`min-w-0 flex-1 truncate text-[13px] ${on ? "text-neutral-100" : "text-neutral-500 line-through"}`}>{n}</span>
              <span className="shrink-0 text-[12px] text-neutral-500">{k}</span>
              <span className="grid size-8 shrink-0 place-items-center text-neutral-300"><Eye on={on} /></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MixerPanel({ c, fill = false }: { c: Ctl; fill?: boolean }) {
  return (
    <section aria-label="Mélangeur audio" className={panel}>
      <h2 className={panelTitle}>Mixer audio</h2>
      <div className="min-h-0 flex-1 overflow-hidden p-1.5">
        <ul className={`flex gap-2 ${fill ? "h-[260px]" : "h-full"}`}>
          {MIX.map((m) => {
            const mic = m.name === "Micro";
            const muted = mic && c.muted;
            return (
              <li key={m.name} className="flex h-full w-[5.5rem] shrink-0 flex-col items-center rounded bg-[#0d0d0d] px-1.5 py-1.5">
                <span className="line-clamp-3 min-h-[2.3em] w-full break-words text-center text-[11px] font-medium uppercase leading-tight text-neutral-200">{m.name}</span>
                <div className="mt-1 flex min-h-0 flex-1 items-stretch gap-1">
                  <div className="relative w-6" aria-hidden="true">
                    <span className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-[#2a2a2a]" />
                    <span className="absolute left-1/2 h-3 w-5 -translate-x-1/2 rounded-sm bg-white" style={{ bottom: `${Math.round(((m.db + 60) / 60) * 82)}%` }} />
                  </div>
                  <div className="relative w-1.5 overflow-hidden rounded-sm bg-[#1a1a1a]" aria-hidden="true">
                    <div
                      className={`${muted ? "" : "level-bar"} absolute inset-0 origin-bottom bg-gradient-to-t from-emerald-600 via-emerald-500 to-red-500`}
                      style={{ transform: muted ? "scaleY(0)" : undefined, "--p": 0.45 + (m.seed % 4) * 0.12, animationDuration: `${650 + m.seed * 170}ms`, animationDelay: `${-m.seed * 230}ms` } as React.CSSProperties}
                    />
                  </div>
                </div>
                <span className="mt-1 text-[12px] tabular-nums text-neutral-300">{m.db.toFixed(1)}</span>
                <div className="mt-1 flex gap-1">
                  <button type="button" aria-pressed={muted} aria-label={muted ? "Réactiver le micro" : "Couper le micro"} onClick={mic ? c.toggleMute : undefined} className={`${flat} size-7 ${muted ? "!border-red-700 !text-red-400" : ""}`}><MicIcon off={muted} /></button>
                  <span className={`${flat} size-7 ${mic ? "!border-white/40 !text-white" : ""}`}><HeadphonesIcon /></span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ControlsPanels({ c }: { c: Ctl }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <section aria-label="Contrôles" className={panel}>
        <h2 className={panelTitle}>Contrôles</h2>
        <div className="grid gap-1.5 p-2">
          <button type="button" onClick={c.toggleLive} className={`${flat} h-10 ${c.live ? "!border-red-700 !bg-red-700 !text-white" : ""}`}>
            {c.live ? `Arrêter le direct · ${clock(c.seconds)}` : "Partir en direct"}
          </button>
          <span className={`${flat} h-10`}>Démarrer l&apos;enregistrement</span>
        </div>
      </section>
      <section aria-label="Flux" className={`${panel} shrink-0`}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
          <span className="font-semibold">Flux</span>
          <span className="min-w-0 truncate text-neutral-300">{c.live ? `${Math.round(c.bitrate * 1000)} kbit/s · x264` : "—"}</span>
        </div>
      </section>
    </div>
  );
}

function MultiPanel({ c }: { c: Ctl }) {
  return (
    <section aria-label="Multistream" className={panel}>
      <div className="flex items-center justify-between gap-2 border-b border-[#262626] px-3 py-2">
        <h2 className="text-[13px] font-semibold">Multistream</h2>
        <span className={`${flat} h-7 gap-1 px-2.5`}>+ Ajouter</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <div className="rounded-md border border-[#262626] bg-[#0b0b0b] p-2">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md bg-white text-[14px] font-bold text-black">S</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">Ma chaîne</p>
              <p className={`text-[12px] ${c.live ? "text-emerald-400" : "text-neutral-500"}`}>Direct d&apos;OBS · {c.live ? "En direct" : "Arrêté"}</p>
            </div>
          </div>
        </div>
        <p className="mt-2 px-1 text-[12px] text-neutral-500">Ajoute une autre plateforme : choisis son logo, colle ta clé de stream, c&apos;est prêt.</p>
      </div>
    </section>
  );
}

/** Ordinateur : la page Contrôle à distance en plein écran (Programme au-dessus, puis cinq panneaux). */
export function MacUI({ c }: { c: Ctl }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#070708] text-[13px] text-neutral-100">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#262626] px-3.5">
        <h1 className="flex items-center gap-2.5 text-[14px] font-medium">Contrôle à distance <LiveBadge c={c} /></h1>
        <span className="inline-flex h-8 items-center gap-1.5 rounded border border-[#2e2e2e] px-3 text-[13px] text-neutral-300"><span aria-hidden="true">←</span> Retour</span>
      </header>
      <div className="mx-2 mt-2 flex h-11 shrink-0 items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0b0b0d] px-3">
        <span className="shrink-0 whitespace-nowrap font-medium">OBS-DJ-SYXTEE<span className="ml-2 text-[12px] font-normal text-neutral-500">38 ms</span></span>
        <span className="flex shrink-0 items-center gap-1.5 text-neutral-400">Profil <span className={`${field} w-40`}>Direct IRL</span></span>
        <span className="flex shrink-0 items-center gap-1.5 text-neutral-400">Collection <span className={`${field} w-40`}>Stream</span></span>
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-emerald-400"><span aria-hidden="true" className="size-2 rounded-full bg-emerald-400" />Flux › IPHONE 16</span>
        <span className={`${flat} h-7 gap-1.5 px-2.5`}><span aria-hidden="true">⚙</span> Régie auto</span>
        <span className={`${flat} ml-auto h-7 px-2.5`}>Chat</span>
        <span className={`${flat} h-7 px-2.5`}>Mode studio</span>
      </div>
      <main className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        <section aria-label="Programme" className="relative grid h-[64%] min-h-0 shrink-0 grid-rows-[auto_1fr] rounded-xl border border-white/[0.08] bg-[#0b0b0d]">
          <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2">
            <p className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden whitespace-nowrap text-[13px]">
              <span className="text-neutral-500">Programme</span>
              <span className="truncate text-neutral-100">{sceneLabel(c.scene)}</span>
              <span className={c.live ? "text-red-500" : "text-neutral-500"}>{c.live ? "en direct" : "hors direct"}</span>
            </p>
            <div className="flex shrink-0 gap-1.5">
              <span className={`${flat} h-7 gap-1.5 px-2.5`}>Son</span>
              <span className={`${flat} h-7 px-2.5`}>Couper l&apos;aperçu</span>
            </div>
          </div>
          <div className="min-h-0 px-2 pb-2">
            <div className="mx-auto aspect-video h-full max-w-full overflow-hidden rounded-lg"><LivePreview scene={c.scene} live={c.live} seconds={c.seconds} size={16} /></div>
          </div>
        </section>
        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(9rem,1.1fr)_minmax(10rem,1.8fr)_minmax(12rem,2.2fr)_minmax(10rem,1fr)_minmax(13rem,1.5fr)] gap-2">
          <ScenesPanel c={c} />
          <SourcesPanel c={c} />
          <MixerPanel c={c} />
          <ControlsPanels c={c} />
          <MultiPanel c={c} />
        </div>
      </main>
    </div>
  );
}

type Tab = "scenes" | "sources" | "mixer" | "controls";
const TABS: [Tab, string, React.ReactNode][] = [
  ["scenes", "Scènes", <><rect key="a" x="3" y="5" width="18" height="14" rx="2" /><path key="b" d="M3 10h18M8 5l-2 5M14 5l-2 5M20 5l-2 5" /></>],
  ["sources", "Sources", <><path key="a" d="M12 3l9 5-9 5-9-5 9-5Z" /><path key="b" d="M3 13l9 5 9-5" /></>],
  ["mixer", "Mixer", <><path key="a" d="M6 4v16M12 4v16M18 4v16" /><circle key="b" cx="6" cy="9" r="2" fill="currentColor" /><circle key="c" cx="12" cy="15" r="2" fill="currentColor" /><circle key="d" cx="18" cy="8" r="2" fill="currentColor" /></>],
  ["controls", "Direct", <><circle key="a" cx="12" cy="12" r="9" /><path key="b" d="M10 8.5v7l6-3.5-6-3.5Z" /></>],
];

/** Téléphone : mêmes panneaux, un à la fois, avec la barre d'onglets du bas. */
export function PhoneUI({ c }: { c: Ctl }) {
  const [tab, setTab] = useState<Tab>("scenes");
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-black pt-[54px] text-[13px] text-neutral-100">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#262626] px-3.5">
        <h1 className="flex items-center gap-2 text-[14px] font-medium">Contrôle à distance</h1>
        <span className="inline-flex h-9 items-center gap-1.5 rounded border border-[#2e2e2e] px-3 text-[13px] text-neutral-300"><span aria-hidden="true">←</span> Retour</span>
      </header>
      <div className="mx-2 mt-2 flex h-11 shrink-0 items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0b0b0d] px-3">
        <span className="shrink-0 whitespace-nowrap font-medium">OBS-DJ-SYXTEE<span className="ml-2 text-[12px] font-normal text-neutral-500">38 ms</span></span>
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-emerald-400"><span aria-hidden="true" className="size-2 rounded-full bg-emerald-400" />Flux reçu</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        <section aria-label="Programme" className="grid aspect-[16/12] shrink-0 grid-rows-[auto_1fr] rounded-xl border border-white/[0.08] bg-[#0b0b0d]">
          <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2">
            <p className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden whitespace-nowrap text-[13px]">
              <span className="truncate text-neutral-100">{sceneLabel(c.scene)}</span>
              <span className={c.live ? "text-red-500" : "text-neutral-500"}>{c.live ? "en direct" : "hors direct"}</span>
            </p>
            <span className={`${flat} h-7 px-2.5`}>Aperçu</span>
          </div>
          <div className="min-h-0 px-2 pb-2"><div className="mx-auto aspect-video h-full max-w-full overflow-hidden rounded-sm"><LivePreview scene={c.scene} live={c.live} seconds={c.seconds} size={11} /></div></div>
        </section>
        <div className="min-h-0 flex-1 [&>*]:h-full">
          {tab === "scenes" && <ScenesPanel c={c} touch={1} />}
          {tab === "sources" && <SourcesPanel c={c} />}
          {tab === "mixer" && <MixerPanel c={c} />}
          {tab === "controls" && <ControlsPanels c={c} />}
        </div>
        <nav role="tablist" aria-label="Panneaux" className="-mx-2 -mb-2 grid shrink-0 grid-cols-4 border-t border-[#262626] bg-black px-1 pb-[26px] pt-1">
          {TABS.map(([id, t, icon]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] ${tab === id ? "text-white" : "text-neutral-500"}`}>
              {tab === id && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-white" />}
              <Svg size={22}>{icon}</Svg>
              <span className="max-w-full truncate">{t}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

/** Montre : la télécommande en réduit : état du direct, scène du programme avec précédente / suivante, micro, direct. */
export function WatchUI({ c }: { c: Ctl }) {
  const i = SCENES.findIndex((s) => s.id === c.scene);
  const go = (d: number) => c.setScene(SCENES[(i + d + SCENES.length) % SCENES.length].id);
  const btn = `${flat} h-8 text-[14px] active:scale-95`;
  return (
    <div className="flex h-full w-full flex-col gap-[6px] bg-black p-[10px] pt-[14px] text-white">
      <div className="flex items-center justify-between">
        {c.live ? (
          <span className="inline-flex items-center gap-1 rounded border border-red-700 bg-red-700/20 px-[5px] py-[1px] text-[9px] font-semibold tracking-wide text-red-300"><span aria-hidden="true" className="size-[5px] animate-pulse rounded-full bg-red-500" />EN DIRECT</span>
        ) : (
          <span className="text-[9px] text-neutral-500">HORS DIRECT</span>
        )}
        <span className="font-mono text-[10px] tabular-nums text-neutral-400">{c.live ? clock(c.seconds) : "00:00:00"}</span>
      </div>
      <div className="rounded border border-[#262626] bg-[#0b0b0b] px-[8px] py-[6px]">
        <p className="text-[9px] text-neutral-500">Programme</p>
        <p className="mt-[2px] truncate rounded bg-white/[0.13] px-[6px] py-[3px] text-[11px] font-medium leading-tight">{sceneLabel(c.scene)}</p>
      </div>
      <div className="grid grid-cols-3 gap-[5px]">
        <button type="button" aria-label="Scène précédente" onClick={() => go(-1)} className={btn}>‹</button>
        <button type="button" aria-label={c.muted ? "Réactiver le micro" : "Couper le micro"} aria-pressed={c.muted} onClick={c.toggleMute} className={`${btn} ${c.muted ? "!border-red-700 !text-red-400" : ""}`}><MicIcon off={c.muted} /></button>
        <button type="button" aria-label="Scène suivante" onClick={() => go(1)} className={btn}>›</button>
      </div>
      <button type="button" onClick={c.toggleLive} className={`${flat} mt-auto h-9 text-[11px] ${c.live ? "!border-red-700 !bg-red-700 !text-white" : ""}`}>
        {c.live ? "Arrêter le direct" : "Partir en direct"}
      </button>
    </div>
  );
}
