"use client";

import AnimatedNumber from "./AnimatedNumber";
import { clock, LivePreview, SCENES, type Ctl, type SceneId } from "./ObsScreens";

// Interfaces de la démo d'accueil : la vraie console du Contrôle à distance (tableau de bord), sur ordinateur et téléphone,
// et une version montre. Même session synchronisée (scène, micro, direct). Tailles en pixels : réduites par le composant Device.

const EMOJI: Record<SceneId, string> = { drone: "⏳", live: "🔴", brb: "📶", chat: "🔚" };
const SOURCES: [string, string, boolean][] = [
  ["Flux › IPHONE 16", "Média", true],
  ["Chat en direct", "Navigateur", true],
  ["Caméra salon", "Caméra", false],
  ["Overlay alertes", "Navigateur", true],
];
const MIX: [string, number][] = [["Micro", 1], ["Flux IPHONE", 2], ["Musique", 3]];

const Eye = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" className={`size-[15px] shrink-0 ${on ? "text-white" : "text-white/30"}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{!on && <path d="M4 4l16 16" />}
  </svg>
);

function Meter({ muted, seed }: { muted: boolean; seed: number }) {
  return (
    <span className="relative block h-[7px] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
      <span
        className={`gauge-fill absolute inset-0 origin-left rounded-full ${muted ? "scale-x-[0.03] bg-white/20" : "bg-[linear-gradient(90deg,#059669_70%,#10b981_88%,#ef4444)]"}`}
        style={muted ? undefined : ({ "--p": 0.4 + (seed % 5) * 0.1, animationDuration: `${700 + seed * 130}ms`, animationDelay: `${seed * 90}ms` } as React.CSSProperties)}
      />
    </span>
  );
}

function Panel({ title, count, children, className = "" }: { title: string; count?: number; children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-[8px] border border-white/10 bg-[#0b0b0d] ${className}`}>
      <h3 className="flex items-center gap-[8px] border-b border-white/10 px-[12px] py-[8px] text-[13px] font-medium">
        {title}
        {count != null && <span className="text-[11px] font-normal text-white/40">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

const sceneLabel = (id: SceneId) => (SCENES.find((s) => s.id === id)?.name ?? "").toUpperCase();

/** Ordinateur : barre de menus Mac, onglet, puis la console du tableau de bord. */
export function MacUI({ c }: { c: Ctl }) {
  return (
    <div className="flex h-full w-full flex-col bg-[#050506] text-[13px] leading-tight text-white">
      <div className="flex h-[28px] shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.06] px-[16px] text-[12px]">
        <div className="flex items-center gap-[18px]">
          <span aria-hidden="true" className="h-[10px] w-[10px] rounded-[3px] bg-white/80" />
          <span className="font-semibold">Safari</span>
          {["Fichier", "Édition", "Présentation", "Historique", "Fenêtre", "Aide"].map((m) => <span key={m} className="text-white/70">{m}</span>)}
        </div>
        <span className="tabular-nums text-white/80">10:42</span>
      </div>
      <div className="flex h-[34px] shrink-0 items-center gap-[12px] border-b border-white/10 px-[14px]">
        <div className="flex gap-[7px]" aria-hidden="true"><span className="size-[10px] rounded-full bg-white/20" /><span className="size-[10px] rounded-full bg-white/20" /><span className="size-[10px] rounded-full bg-white/20" /></div>
        <span className="mx-auto rounded-[6px] bg-white/[0.06] px-[60px] py-[3px] text-[11px] text-white/45">syxtee-networks.fr/dashboard/controle-a-distance</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-[10px] p-[12px]">
        <div className="flex shrink-0 items-center gap-x-[16px] rounded-[8px] border border-white/10 bg-[#0b0b0d] px-[12px] py-[8px] text-[12px]">
          <span className="font-medium">OBS-DJ-SYXTEE</span>
          <span className="text-white/40">38 ms</span>
          <span className="flex items-center gap-[6px]"><span className="size-[6px] rounded-full bg-white" />Flux reçu <span className="text-white/45">1920×1080</span></span>
          <span className="flex items-center gap-[6px]"><span className="size-[6px] rounded-full bg-white" />Signal stable</span>
          <span className="ml-auto flex items-center gap-[6px] font-mono text-white/75"><span className="size-[6px] rounded-full bg-[var(--live)]" />{c.live ? `EN LIVE ${clock(c.seconds)}` : "HORS LIGNE"}</span>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[1.5fr_1fr] gap-[10px]">
          <div className="flex min-h-0 flex-col gap-[10px]">
            <div className="aspect-video w-full"><LivePreview scene={c.scene} live={c.live} seconds={c.seconds} size={15} /></div>
            <div className="grid grid-cols-4 gap-[8px]">
              {[["Débit", c.live ? c.bitrate : 0, "Mb/s", 1], ["Latence", c.live ? c.latency : 0, "ms", 0], ["FPS", c.live ? c.fps : 0, "", 0], ["Perte", c.live ? c.loss : 0, "%", 1]].map(([k, v, u, d]) => (
                <div key={String(k)} className="rounded-[8px] border border-white/10 bg-[#0b0b0d] p-[9px]">
                  <p className="text-[11px] text-white/50">{k}</p>
                  <p className="mt-[4px] font-mono text-[16px] tabular-nums"><AnimatedNumber value={Number(v)} decimals={Number(d)} /> <span className="text-[10px] text-white/45">{u}</span></p>
                </div>
              ))}
            </div>
            <Panel title="Contrôles" className="min-h-0 flex-1">
              <div className="flex gap-[8px] p-[10px] text-[12px]">
                <button type="button" onClick={c.toggleLive} className={`flex-1 rounded-[6px] px-[12px] py-[8px] text-center font-medium ${c.live ? "bg-red-700" : "bg-white text-black"}`}>{c.live ? `Arrêter le direct ${clock(c.seconds).replace(/^00:/, "")}` : "Démarrer le direct"}</button>
                <span className="flex-1 rounded-[6px] border border-white/10 bg-white/[0.05] px-[12px] py-[8px] text-center text-white/80">Démarrer l&apos;enregistrement</span>
              </div>
            </Panel>
          </div>
          <div className="flex min-h-0 flex-col gap-[10px]">
            <Panel title="Scènes" count={SCENES.length}>
              <ul className="space-y-[2px] p-[6px] text-[12.5px]">
                {SCENES.map((s) => {
                  const on = c.scene === s.id;
                  return (
                    <li key={s.id}>
                      <button type="button" onClick={() => c.setScene(s.id)} aria-pressed={on} className={`flex w-full items-center gap-[8px] rounded-[5px] px-[8px] py-[7px] text-left transition-colors duration-150 ${on ? "bg-[#2f4fc4] font-medium text-white" : "text-white/70 hover:bg-white/[0.05]"}`}>
                        <span>{EMOJI[s.id]}</span><span className="truncate">› {sceneLabel(s.id)}</span>
                        {on && c.live && <span className="ml-auto text-[11px] text-white/80">direct</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
            <Panel title="Sources" count={SOURCES.length}>
              <ul className="p-[6px] text-[12.5px]">
                {SOURCES.map(([n, k, on]) => (
                  <li key={n} className="flex items-center gap-[8px] rounded-[5px] px-[8px] py-[6px]"><Eye on={on} /><span className={`truncate ${on ? "text-white/85" : "text-white/40"}`}>{n}</span><span className="ml-auto text-[11px] text-white/35">{k}</span></li>
                ))}
              </ul>
            </Panel>
            <Panel title="Mixeur audio" className="min-h-0 flex-1">
              <ul className="space-y-[10px] p-[10px]">
                {MIX.map(([n, seed]) => {
                  const mic = n === "Micro";
                  return (
                    <li key={n}>
                      <div className="mb-[5px] flex items-center justify-between text-[12px]">
                        <span className="text-white/75">{n}</span>
                        {mic && <button type="button" onClick={c.toggleMute} aria-pressed={c.muted} className={`rounded-[5px] border px-[8px] py-[1px] text-[11px] ${c.muted ? "border-red-500/50 text-red-400" : "border-white/15 text-white/70"}`}>{c.muted ? "Muet" : "Couper"}</button>}
                      </div>
                      <Meter muted={mic && c.muted} seed={seed} />
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Téléphone : la console mobile (programme, scènes, mixeur, contrôles) avec la barre d'onglets du bas. */
export function PhoneUI({ c }: { c: Ctl }) {
  return (
    <div className="relative flex h-full w-full flex-col bg-black pt-[54px] text-[14px] leading-tight text-neutral-100">
      <header className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#262626] px-[16px]">
        <h1 className="text-[16px] font-medium">Contrôle à distance</h1>
        <span className="rounded border border-[#2e2e2e] px-[10px] py-[4px] text-[12px] text-neutral-300">← Retour</span>
      </header>
      <div className="mx-[12px] mt-[10px] flex h-[40px] shrink-0 items-center gap-[10px] rounded-[6px] border border-[#262626] bg-[#0b0b0b] px-[12px] text-[13px]">
        <span className="font-medium">OBS-DJ-SYXTEE</span>
        <span className="text-[11px] text-neutral-500">38 ms</span>
        <span className="ml-auto flex items-center gap-[6px] text-emerald-400"><span className="size-[7px] rounded-full bg-emerald-400" />Flux reçu</span>
      </div>
      <div className="mx-[12px] mt-[10px] aspect-video shrink-0 overflow-hidden rounded-[6px] border border-[#262626]"><LivePreview scene={c.scene} live={c.live} seconds={c.seconds} size={11} /></div>
      <div className="mx-[12px] mt-[10px] overflow-hidden rounded-[6px] border border-[#262626] bg-[#0b0b0b]">
        <h3 className="border-b border-[#262626] px-[14px] py-[9px] text-[14px] font-medium">Scènes <span className="text-[12px] font-normal text-neutral-500">{SCENES.length}</span></h3>
        <ul>
          {SCENES.map((s) => {
            const on = c.scene === s.id;
            return (
              <li key={s.id}>
                <button type="button" onClick={() => c.setScene(s.id)} aria-pressed={on} className={`flex h-[40px] w-full items-center gap-[10px] px-[14px] text-left text-[14px] ${on ? "bg-[#2f4fc4] text-white" : ""}`}>
                  <span className={`size-[6px] rounded-full ${on ? "bg-white" : "bg-neutral-500"}`} />
                  <span>{EMOJI[s.id]}</span><span className="truncate">› {sceneLabel(s.id)}</span>
                  {on && c.live && <span className="ml-auto text-[11px] text-white/80">direct</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mx-[12px] mt-[10px] flex items-center gap-[10px] rounded-[6px] border border-[#262626] bg-[#0b0b0b] px-[14px] py-[10px]">
        <span className="w-[44px] text-[13px] text-neutral-300">Micro</span>
        <span className="flex-1"><Meter muted={c.muted} seed={1} /></span>
        <button type="button" onClick={c.toggleMute} aria-pressed={c.muted} className={`rounded border px-[9px] py-[2px] text-[11px] ${c.muted ? "border-red-500/50 text-red-400" : "border-[#2e2e2e] text-neutral-400"}`}>{c.muted ? "Muet" : "Couper"}</button>
      </div>
      <button type="button" onClick={c.toggleLive} className={`mx-[12px] mt-[10px] rounded-[6px] py-[11px] text-center text-[14px] font-medium ${c.live ? "bg-red-700" : "bg-white text-black"}`}>
        {c.live ? <>Arrêter le direct <span className="font-normal text-white/80">{clock(c.seconds).replace(/^00:/, "")}</span></> : "Démarrer le direct"}
      </button>
    </div>
  );
}

/** Montre : même télécommande en grand format réduit : scène, précédent / suivant, micro, direct. */
export function WatchUI({ c }: { c: Ctl }) {
  const i = SCENES.findIndex((s) => s.id === c.scene);
  const go = (d: number) => c.setScene(SCENES[(i + d + SCENES.length) % SCENES.length].id);
  const btn = "grid h-[34px] place-items-center rounded-[8px] border border-white/10 bg-[#0b0b0d] text-[15px] active:scale-95";
  return (
    <div className="flex h-full w-full flex-col gap-[7px] bg-black p-[12px] pt-[16px] text-white">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-[5px] text-[10px] font-mono"><span className="size-[6px] rounded-full bg-[var(--live)]" aria-hidden="true" />{c.live ? "EN LIVE" : "HORS LIGNE"}</span>
        <span className="font-mono text-[10px] tabular-nums text-white/60">{c.live ? clock(c.seconds) : "00:00:00"}</span>
      </div>
      <div className="rounded-[8px] bg-[#2f4fc4] px-[8px] py-[7px]">
        <p className="text-[9px] uppercase tracking-[0.08em] text-white/70">Scène</p>
        <p className="truncate text-[13px] font-medium leading-tight">{EMOJI[c.scene]} {sceneLabel(c.scene)}</p>
      </div>
      <div className="grid grid-cols-3 gap-[6px]">
        <button type="button" aria-label="Scène précédente" onClick={() => go(-1)} className={btn}>‹</button>
        <button type="button" aria-label={c.muted ? "Réactiver le micro" : "Couper le micro"} aria-pressed={c.muted} onClick={c.toggleMute} className={`${btn} text-[11px] ${c.muted ? "text-red-400" : ""}`}>{c.muted ? "Muet" : "Micro"}</button>
        <button type="button" aria-label="Scène suivante" onClick={() => go(1)} className={btn}>›</button>
      </div>
      <button type="button" onClick={c.toggleLive} className={`mt-auto h-[34px] rounded-[8px] text-[12px] font-medium ${c.live ? "bg-red-700" : "bg-white text-black"}`}>
        {c.live ? "Arrêter le direct" : "Démarrer"}
      </button>
    </div>
  );
}
