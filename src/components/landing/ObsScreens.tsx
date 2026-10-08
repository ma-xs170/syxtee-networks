"use client";

import { memo } from "react";
import AnimatedNumber from "./AnimatedNumber";

// Interfaces affichées sur les écrans de la démo OBS CLOUD (ordinateur 1280 x 800, téléphone 390 x 844, montre 184 x 224).
// Tailles en pixels : chaque écran est dessiné à taille fixe puis réduit par le composant Device. Aucun placeholder gris : tout est animé ou rempli.
export const SCENES = [
  { id: "drone", name: "Début du stream", key: "⌘1" },
  { id: "live", name: "En direct", key: "⌘2" },
  { id: "brb", name: "Connexion perdue", key: "⌘3" },
  { id: "chat", name: "Fin du stream", key: "⌘4" },
] as const;
export type SceneId = (typeof SCENES)[number]["id"];
export type Ctl = {
  scene: SceneId;
  muted: boolean;
  live: boolean;
  setScene: (s: SceneId) => void;
  toggleMute: () => void;
  toggleLive: () => void;
  seconds: number;
  bitrate: number;
  latency: number;
  loss: number;
  fps: number;
};
export const clock = (s: number) => {
  const n = Math.floor(s);
  return [Math.floor(n / 3600), Math.floor((n % 3600) / 60), n % 60].map((x) => String(x).padStart(2, "0")).join(":");
};

/** Vue d'une scène : dégradé en mouvement et silhouette. Utilisée pour l'aperçu et les miniatures. */
function SceneArt({ id, thumb = false }: { id: SceneId; thumb?: boolean }) {
  // Miniatures : pas de texte (illisible à cette taille), des formes seulement.
  if (thumb && id === "brb")
    return <div className="absolute inset-0 grid place-items-center"><span className="h-[3px] w-[60%] rounded-full bg-white/40" /></div>;
  if (thumb && id === "drone")
    return <div className="absolute inset-0 grid place-items-center"><span className="h-[3px] w-[40%] rounded-full bg-white/40" /></div>;
  if (thumb && id === "chat")
    return (
      <div className="absolute inset-0 flex flex-col justify-center gap-[3px] px-[6px]">
        {[80, 55, 70].map((w) => <span key={w} className="h-[3px] rounded-full bg-white/40" style={{ width: `${w}%` }} />)}
      </div>
    );
  switch (id) {
    case "live":
      return (
        <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx="122" cy="22" r="9" fill="#fff" fillOpacity="0.18" className="sun-drift" />
          <path d="M0 64 L30 46 L58 58 L96 32 L128 52 L160 40 V90 H0Z" fill="#fff" fillOpacity="0.08" />
          <path d="M0 74 L40 62 L80 72 L120 60 L160 70 V90 H0Z" fill="#fff" fillOpacity="0.06" />
          {/* streamer IRL : silhouette avec perche et téléphone */}
          <g fill="#fff" fillOpacity="0.55" className="walk-bob">
            <circle cx="62" cy="44" r="5" />
            <path d="M56 52h12l3 20h-4l-2-9-2 9h-4l-2-9-2 9h-4Z" />
            <path d="M68 50l14-14" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.4" fill="none" />
            <rect x="80" y="30" width="5" height="9" rx="1" />
          </g>
        </svg>
      );
    case "drone":
      return (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]">
          <span className="text-[1.6em] font-semibold tracking-tight text-white">Le stream commence bientôt</span>
        </div>
      );
    case "brb":
      return (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]">
          <span className="text-[1.6em] font-semibold tracking-tight text-white">Connexion perdue, on revient</span>
        </div>
      );
    case "chat":
      return (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]">
          <span className="text-[1.6em] font-semibold tracking-tight text-white">Merci d&apos;avoir regardé</span>
        </div>
      );
  }
}

/** Aperçu vidéo animé : fond en mouvement, scène en fondu enchaîné (opacité + flou), overlay LIVE avec timer. */
export const LivePreview = memo(function LivePreview({ scene, live, seconds, size }: { scene: SceneId; live: boolean; seconds: number; size: number }) {
  return (
    <div className="drift-bg relative h-full w-full overflow-hidden rounded-[8px] border border-white/10" style={{ fontSize: size }}>
      {SCENES.map((s) => (
        <div key={s.id} className={`absolute inset-0 transition-[opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${s.id === scene ? "opacity-100 blur-0" : "opacity-0 blur-md"}`}>
          <SceneArt id={s.id} />
        </div>
      ))}
      {live && (
        <span className="absolute left-[0.8em] top-[0.8em] inline-flex items-center gap-[0.5em] rounded-full bg-black/60 px-[0.8em] py-[0.35em] text-[0.8em] font-semibold text-white">
          <span className="live-dot" aria-hidden="true" />
          LIVE <span className="font-mono tabular-nums text-white/70">{clock(seconds)}</span>
        </span>
      )}
    </div>
  );
});

/** Jauge audio animée en CSS (transform seulement). Coupée : jauge au repos. */
const Gauge = memo(function Gauge({ muted, seed }: { muted: boolean; seed: number }) {
  return (
    <span className="relative block h-[8px] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
      <span
        className={`gauge-fill absolute inset-0 origin-left rounded-full ${muted ? "scale-x-[0.03] bg-white/20" : "bg-[linear-gradient(90deg,var(--ok)_70%,var(--warn)_92%,var(--bad))]"}`}
        style={muted ? undefined : ({ "--p": 0.45 + (seed % 5) * 0.1, animationDuration: `${700 + seed * 130}ms`, animationDelay: `${seed * 90}ms` } as React.CSSProperties)}
      />
    </span>
  );
});

const Slider = ({ value }: { value: number }) => (
  <span className="relative mt-[10px] block h-[4px] rounded-full bg-white/15" aria-hidden="true">
    <span className="absolute inset-y-0 left-0 rounded-full bg-white/60" style={{ width: `${value}%` }} />
    <span className="absolute top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full border border-white/30 bg-white shadow" style={{ left: `calc(${value}% - 7px)` }} />
  </span>
);

const Eye = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    {on ? <><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="2" /></> : <><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" /></>}
  </svg>
);

const MENUS = ["Fichier", "Édition", "Scènes", "Sources", "Audio", "Outils", "Aide"];
const SOURCES: [string, boolean][] = [["Caméra principale", true], ["Drone", true], ["Alerte chat", true], ["Musique", false]];

/** Ordinateur : barre de menus, fenêtre OBS CLOUD (scènes, aperçu, sources, mixeur, stats), barre du bas avec le bouton du direct. */
export function MacUI({ c }: { c: Ctl }) {
  const chip = "rounded-[8px] border border-white/10 bg-white/[0.05] px-[14px] py-[7px] text-[13px] text-white/85";
  return (
    <div className="flex h-full w-full flex-col bg-[#050506] text-[13px] leading-tight text-white">
      {/* barre de menus */}
      <div className="flex h-[28px] shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.06] px-[16px] text-[12px]">
        <div className="flex items-center gap-[18px]">
          <span aria-hidden="true" className="h-[10px] w-[10px] rounded-[3px] bg-white/80" />
          <span className="font-semibold">Contrôle à distance</span>
          {MENUS.map((m) => <span key={m} className="text-white/70">{m}</span>)}
        </div>
        <div className="flex items-center gap-[14px] text-white/80">
          <span className="inline-flex items-center gap-[6px] rounded-full bg-white/[0.08] px-[9px] py-[2px] text-[11px]"><span className="h-[6px] w-[6px] rounded-full bg-[var(--ok)]" />Connecté</span>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M1.5 6a9.5 9.5 0 0 1 13 0M3.7 8.6a6.4 6.4 0 0 1 8.6 0M6 11.2a3.2 3.2 0 0 1 4 0" /><circle cx="8" cy="13" r="0.8" fill="currentColor" /></svg>
          <svg viewBox="0 0 24 14" width="22" height="13" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><rect x="1" y="2" width="19" height="10" rx="3" /><rect x="3" y="4" width="13" height="6" rx="1.5" fill="currentColor" stroke="none" /><path d="M22 5v4" strokeLinecap="round" /></svg>
          <span className="tabular-nums">10:42</span>
        </div>
      </div>
      {/* fenêtre */}
      <div className="m-[14px] mt-[12px] flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-white/10 bg-[#0c0c0e]">
        <div className="relative flex h-[38px] shrink-0 items-center border-b border-white/10 px-[14px]">
          <div className="flex gap-[7px]" aria-hidden="true">
            <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]/60" /><span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]/60" /><span className="h-[11px] w-[11px] rounded-full bg-[#28c840]/60" />
          </div>
          <p className="absolute inset-x-0 text-center text-[13px] text-white/70">Contrôle à distance · {SCENES.find((s) => s.id === c.scene)?.name}</p>
        </div>
        <div className="flex h-[48px] shrink-0 items-center gap-[10px] border-b border-white/10 px-[14px]">
          <button type="button" onClick={c.toggleLive} className={`${chip} ${c.live ? "" : "bg-white text-black"}`}>{c.live ? "Direct en cours" : "Démarrer le direct"}</button>
          <span className={chip}>Pause</span>
          <span className={chip}>Enregistrer</span>
          <span className={`${chip} ml-auto`}>Paramètres</span>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[250px_1fr_268px] gap-[14px] p-[14px]">
          {/* scènes + sources */}
          <div className="flex min-h-0 flex-col gap-[14px]">
            <section>
              <p className="mb-[8px] text-[11px] uppercase tracking-[0.08em] text-white/45">Scènes</p>
              <ul className="space-y-[6px]">
                {SCENES.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => c.setScene(s.id)} aria-pressed={c.scene === s.id} className={`flex w-full items-center gap-[10px] rounded-[9px] border p-[6px] text-left transition-colors duration-150 ${c.scene === s.id ? "border-white/35 bg-white/[0.09]" : "border-white/10 hover:border-white/20"}`}>
                      <span className="drift-bg relative block h-[32px] w-[56px] shrink-0 overflow-hidden rounded-[5px]"><SceneArt id={s.id} thumb /></span>
                      <span className="flex-1 text-[13px]">{s.name}</span>
                      <span className="font-mono text-[11px] text-white/40">{s.key}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <p className="mb-[8px] text-[11px] uppercase tracking-[0.08em] text-white/45">Sources</p>
              <ul className="space-y-[2px]">
                {SOURCES.map(([n, on]) => (
                  <li key={n} className="flex items-center justify-between rounded-[7px] px-[8px] py-[7px] text-[12.5px] text-white/80 odd:bg-white/[0.03]">
                    {n}<span className={on ? "text-white/70" : "text-white/35"}><Eye on={on} /></span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          {/* aperçu + stats */}
          <div className="flex min-h-0 flex-col gap-[12px]">
            <div className="aspect-video w-full"><LivePreview scene={c.scene} live={c.live} seconds={c.seconds} size={15} /></div>
            <div className="grid grid-cols-4 gap-[10px]">
              {[
                ["Débit", c.live ? c.bitrate : 0, "Mb/s", 1],
                ["Latence", c.live ? c.latency : 0, "ms", 0],
                ["FPS", c.live ? c.fps : 0, "", 0],
                ["Perte", c.live ? c.loss : 0, "%", 1],
              ].map(([k, v, u, d]) => (
                <div key={String(k)} className="rounded-[9px] border border-white/10 bg-white/[0.03] p-[10px]">
                  <p className="flex items-center gap-[6px] text-[11px] text-white/50"><span className="h-[6px] w-[6px] rounded-full bg-[var(--ok)]" />{k}</p>
                  <p className="mt-[6px] font-mono text-[18px] tabular-nums"><AnimatedNumber value={Number(v)} decimals={Number(d)} /> <span className="text-[11px] text-white/45">{u}</span></p>
                </div>
              ))}
            </div>
            <section className="min-h-0 flex-1 rounded-[10px] border border-white/10 bg-white/[0.03] p-[12px]">
              <p className="mb-[8px] text-[11px] uppercase tracking-[0.08em] text-white/45">Connexions bondées</p>
              <ul className="grid grid-cols-2 gap-x-[16px] gap-y-[8px]">
                {[["4G", 3], ["5G", 4], ["eSIM", 2], ["Satellite", 4]].map(([n, b]) => (
                  <li key={String(n)} className="flex items-center justify-between text-[12.5px] text-white/80">
                    <span className="flex items-center gap-[8px]"><span className="h-[6px] w-[6px] rounded-full bg-[var(--ok)]" />{n}</span>
                    <span className="inline-flex items-end gap-[2px]" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => <span key={i} className={`w-[4px] rounded-[1px] ${i < Number(b) ? "bg-[var(--ok)]" : "bg-white/15"}`} style={{ height: 5 + i * 3 }} />)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          {/* mixeur */}
          <section>
            <p className="mb-[8px] text-[11px] uppercase tracking-[0.08em] text-white/45">Mixeur audio</p>
            <ul className="space-y-[12px]">
              {[["Micro", 70, 1], ["Caméra", 55, 2], ["Musique", 35, 3]].map(([n, v, seed]) => {
                const mic = n === "Micro";
                const muted = mic && c.muted;
                return (
                  <li key={String(n)} className="rounded-[10px] border border-white/10 bg-white/[0.03] p-[12px]">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span>{n}</span>
                      {mic ? (
                        <button type="button" onClick={c.toggleMute} aria-pressed={c.muted} className={`rounded-[6px] border px-[8px] py-[2px] text-[11px] ${muted ? "border-[var(--bad)]/50 text-[var(--bad)]" : "border-white/15 text-white/70"}`}>{muted ? "Muet" : "Couper"}</button>
                      ) : (
                        <span className="font-mono text-[11px] text-white/40">−{20 - Number(seed) * 3} dB</span>
                      )}
                    </div>
                    <div className="mt-[10px]"><Gauge muted={muted} seed={Number(seed)} /></div>
                    <Slider value={Number(v)} />
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
        {/* barre du bas */}
        <div className="flex h-[56px] shrink-0 items-center gap-[20px] border-t border-white/10 bg-white/[0.03] px-[16px]">
          <span className="text-[12px] text-white/55">{c.live ? `En direct · ${clock(c.seconds)}` : "Hors ligne"}</span>
          <button type="button" onClick={c.toggleLive} className={`rounded-full px-[22px] py-[10px] text-[13px] font-semibold transition-colors duration-150 ${c.live ? "bg-[var(--bad)]/20 text-[var(--bad)]" : "bg-white text-black"}`}>
            {c.live ? "Arrêter le live" : "Démarrer le live"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Téléphone : aperçu animé, scènes, mixeur, statistiques, bouton du direct. */
export function PhoneUI({ c }: { c: Ctl }) {
  return (
    <div className="flex h-full w-full flex-col bg-[#050506] px-[20px] pb-[26px] pt-[60px] text-[15px] leading-tight text-white">
      <div className="mb-[14px] flex items-center justify-between">
        <span className="text-[18px] font-semibold tracking-tight">Contrôle à distance</span>
        <span className="inline-flex items-center gap-[6px] rounded-full bg-white/[0.08] px-[10px] py-[4px] text-[12px]"><span className="h-[7px] w-[7px] rounded-full bg-[var(--ok)]" />Connecté</span>
      </div>
      <div className="aspect-video w-full"><LivePreview scene={c.scene} live={c.live} seconds={c.seconds} size={14} /></div>
      <div className="mt-[14px] grid grid-cols-2 gap-[8px]">
        {SCENES.map((s) => (
          <button key={s.id} type="button" onClick={() => c.setScene(s.id)} aria-pressed={c.scene === s.id} className={`flex items-center gap-[8px] rounded-[12px] border p-[8px] text-left transition-colors duration-150 ${c.scene === s.id ? "border-white/35 bg-white/[0.09]" : "border-white/10"}`}>
            <span className="drift-bg relative block h-[26px] w-[44px] shrink-0 overflow-hidden rounded-[5px]"><SceneArt id={s.id} thumb /></span>
            <span className="text-[14px]">{s.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-[14px] space-y-[10px] rounded-[14px] border border-white/10 bg-white/[0.03] p-[12px]">
        {[["Micro", 1], ["Caméra", 2], ["Musique", 3]].map(([n, seed]) => {
          const mic = n === "Micro";
          return (
            <div key={String(n)} className="flex items-center gap-[10px]">
              <span className="w-[62px] text-[13px] text-white/75">{n}</span>
              <span className="flex-1"><Gauge muted={mic && c.muted} seed={Number(seed)} /></span>
              {mic && <button type="button" onClick={c.toggleMute} aria-pressed={c.muted} aria-label={c.muted ? "Réactiver le micro" : "Couper le micro"} className={`rounded-[7px] border px-[9px] py-[3px] text-[11px] ${c.muted ? "border-[var(--bad)]/50 text-[var(--bad)]" : "border-white/15 text-white/70"}`}>{c.muted ? "Muet" : "Micro"}</button>}
            </div>
          );
        })}
      </div>
      <div className="mt-[12px] grid grid-cols-3 gap-[8px] text-center">
        {[["Débit", c.live ? c.bitrate : 0, "Mb/s", 1], ["Latence", c.live ? c.latency : 0, "ms", 0], ["Perte", c.live ? c.loss : 0, "%", 1]].map(([k, v, u, d]) => (
          <div key={String(k)} className="rounded-[12px] border border-white/10 bg-white/[0.03] py-[8px]">
            <p className="text-[11px] text-white/50">{k}</p>
            <p className="font-mono text-[15px] tabular-nums"><AnimatedNumber value={Number(v)} decimals={Number(d)} /> <span className="text-[10px] text-white/45">{u}</span></p>
          </div>
        ))}
      </div>
      <button type="button" onClick={c.toggleLive} className={`mt-auto rounded-full py-[15px] text-[16px] font-semibold transition-colors duration-150 ${c.live ? "bg-[var(--bad)]/20 text-[var(--bad)]" : "bg-white text-black"}`}>
        {c.live ? "Arrêter le live" : "Démarrer le live"}
      </button>
    </div>
  );
}

/** Montre : scène active, scène précédente / suivante, micro, bouton LIVE avec timer. */
export function WatchUI({ c }: { c: Ctl }) {
  const i = SCENES.findIndex((s) => s.id === c.scene);
  const go = (d: number) => c.setScene(SCENES[(i + d + SCENES.length) % SCENES.length].id);
  const btn = "grid h-[34px] place-items-center rounded-[12px] border border-white/10 bg-white/[0.06] text-[15px] active:scale-95";
  return (
    <div className="flex h-full w-full flex-col gap-[8px] bg-black p-[12px] pt-[16px] text-white">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-[5px] rounded-full bg-white/[0.08] px-[7px] py-[2px] text-[11px]">
          <span className="h-[6px] w-[6px] rounded-full" style={{ background: c.live ? "var(--ok)" : "#5b5f66" }} aria-hidden="true" />
          {c.live ? "Live" : "Hors ligne"}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-white/60">{c.live ? clock(c.seconds) : "00:00:00"}</span>
      </div>
      <p className="mt-[2px] text-[10px] uppercase tracking-[0.08em] text-white/45">Scène</p>
      <p className="-mt-[6px] truncate text-[20px] font-semibold leading-tight">{SCENES[i].name}</p>
      <div className="grid grid-cols-3 gap-[6px]">
        <button type="button" aria-label="Scène précédente" onClick={() => go(-1)} className={btn}>‹</button>
        <button type="button" aria-label={c.muted ? "Réactiver le micro" : "Couper le micro"} aria-pressed={c.muted} onClick={c.toggleMute} className={`${btn} text-[11px] ${c.muted ? "text-[var(--bad)]" : ""}`}>{c.muted ? "Muet" : "Micro"}</button>
        <button type="button" aria-label="Scène suivante" onClick={() => go(1)} className={btn}>›</button>
      </div>
      <button type="button" onClick={c.toggleLive} className={`mt-auto h-[36px] rounded-full text-[13px] font-semibold ${c.live ? "bg-[color-mix(in_srgb,var(--bad)_25%,transparent)] text-[var(--bad)]" : "bg-white text-black"}`}>
        {c.live ? "Arrêter" : "LIVE"}
      </button>
    </div>
  );
}
