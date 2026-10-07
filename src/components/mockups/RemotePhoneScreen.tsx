"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Écran de téléphone du Contrôle à distance, dessiné en HTML (pas une capture rognée) : une mise en page fixe de 390 × 844 px
// mise à l'échelle de la largeur de son conteneur, donc jamais coupée, quelle que soit la taille du cadre.
// À placer dans un cadre de téléphone (position relative, overflow caché). Décoratif : aria-hidden.

export type RemoteTab = "scenes" | "sources" | "mixer" | "controls";
const W = 390;
const H = 844;

const SCENES: [string, string][] = [
  ["⏳", "ON COMMENCE BIENTÔT"],
  ["🔴", "EN DIRECT"],
  ["🎥", "DRONE"],
  ["📶", "CONNEXION PERDUE"],
  ["🔚", "FIN DE STREAM"],
];
const SOURCES: [string, string, boolean][] = [
  ["Flux › IPHONE 16", "Média", true],
  ["Chat en direct", "Navigateur", true],
  ["(TXT) Pseudo", "Texte", true],
  ["Caméra salon", "Caméra", false],
  ["Overlay alertes", "Navigateur", true],
];
const MIX: [string, number, number][] = [
  ["Micro", 66, 72],
  ["Flux IPHONE", 52, 58],
  ["Musique", 34, 40],
  ["Discord", 58, 46],
];

function Icon({ id }: { id: RemoteTab }) {
  const p =
    id === "scenes" ? (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M8 5l-2 5M14 5l-2 5M20 5l-2 5" />
      </>
    ) : id === "sources" ? (
      <>
        <path d="M12 3l9 5-9 5-9-5 9-5Z" />
        <path d="M3 13l9 5 9-5" />
      </>
    ) : id === "mixer" ? (
      <>
        <path d="M6 4v16M12 4v16M18 4v16" />
        <circle cx="6" cy="9" r="2" fill="currentColor" />
        <circle cx="12" cy="15" r="2" fill="currentColor" />
        <circle cx="18" cy="8" r="2" fill="currentColor" />
      </>
    ) : (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5v7l6-3.5-6-3.5Z" />
      </>
    );
  return (
    <svg viewBox="0 0 24 24" className="size-[26px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {p}
    </svg>
  );
}

function Panel({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mx-3 mt-3 overflow-hidden rounded-lg border border-[#262626] bg-[#0b0b0b]">
      <h3 className="flex items-center gap-2 border-b border-[#262626] px-4 py-3 text-[15px] font-medium">
        {title}
        {count != null && <span className="text-[13px] font-normal text-neutral-500">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

export default function RemotePhoneScreen({ tab = "scenes", className = "" }: { tab?: RemoteTab; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setK(el.clientWidth / W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} aria-hidden="true" className={`absolute inset-0 overflow-hidden bg-black ${className}`}>
      <div className="origin-top-left select-none bg-black text-[14px] text-neutral-100" style={{ width: W, height: H, transform: `scale(${k})`, visibility: k ? "visible" : "hidden" }}>
        {/* Barre d'état */}
        <div className="flex h-[54px] items-end justify-between px-8 pb-2 text-[15px] font-semibold">
          <span>9:41</span>
          <span className="flex items-center gap-1.5 text-[12px]">
            <span className="flex items-end gap-[2px]">{[5, 8, 11, 14].map((h) => <span key={h} className="w-[3px] rounded-sm bg-white" style={{ height: h }} />)}</span>
            5G
            <span className="ml-1 h-3 w-6 rounded-[4px] border border-white/60 p-[1.5px]"><span className="block h-full w-4/5 rounded-[2px] bg-white" /></span>
          </span>
        </div>

        <header className="flex h-12 items-center justify-between border-b border-[#262626] px-4">
          <h1 className="text-[16px] font-medium">Contrôle à distance</h1>
          <span className="rounded border border-[#2e2e2e] px-3 py-1.5 text-[13px] text-neutral-300">← Retour</span>
        </header>

        <div className="mx-3 mt-3 flex h-12 items-center gap-3 rounded-md border border-[#262626] bg-[#0b0b0b] px-3 text-[14px]">
          <span className="font-medium">OBS-DJ-SYXTEE</span>
          <span className="text-[12px] text-neutral-500">38 ms</span>
          <span className="ml-auto flex items-center gap-1.5 text-emerald-400"><span className="size-2 rounded-full bg-emerald-400" />Flux reçu</span>
          <span className="rounded border border-[#2e2e2e] bg-[#141414] px-2.5 py-1 text-[12px] text-neutral-300">⚙ Réglages</span>
        </div>

        {/* Programme */}
        <section className="mx-3 mt-3 overflow-hidden rounded-md border border-[#262626] bg-black">
          <div className="flex items-center justify-between px-3 py-2.5">
            <p className="flex items-baseline gap-2 text-[14px]"><span className="text-neutral-100">🔴 EN DIRECT</span><span className="text-[13px] text-red-500">en direct</span></p>
            <div className="flex gap-1.5 text-[12px] text-neutral-300">
              <span className="rounded border border-[#2e2e2e] bg-[#141414] px-2.5 py-1.5">Muet</span>
              <span className="rounded border border-[#2e2e2e] bg-[#141414] px-2.5 py-1.5">Couper l&apos;aperçu</span>
            </div>
          </div>
          <div className="relative mx-2 mb-2 aspect-video overflow-hidden rounded-sm bg-[linear-gradient(to_bottom,#3a3f52_0%,#8a6f66_46%,#c08a5e_58%,#2a2420_59%,#14110f_100%)]">
            <div className="absolute inset-x-[30%] bottom-0 h-[44%] bg-[#1a1512] [clip-path:polygon(24%_0,76%_0,100%_100%,0_100%)]" />
            <span className="absolute bottom-[40%] left-1/2 size-[9px] -translate-x-1/2 rounded-full bg-[#0c0a09]" />
            <span className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]" />
          </div>
        </section>

        {/* Panneau de l'onglet */}
        <div className="h-[316px] overflow-hidden">
          {tab === "scenes" && (
            <Panel title="Scènes" count={5}>
              <ul>
                {SCENES.map(([e, n], i) => (
                  <li key={n} className={`flex h-[50px] items-center gap-3 px-4 text-[15px] ${i === 1 ? "bg-[#2f4fc4] text-white" : ""}`}>
                    <span className={`size-1.5 rounded-full ${i === 1 ? "bg-white" : "bg-neutral-500"}`} />
                    <span>{e}</span>
                    <span>› {n}</span>
                    {i === 1 && <span className="ml-auto text-[12px] text-white/80">direct</span>}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {tab === "sources" && (
            <Panel title="Sources" count={SOURCES.length}>
              <ul>
                {SOURCES.map(([n, kind, on]) => (
                  <li key={n} className="flex h-[50px] items-center gap-3 px-4 text-[15px]">
                    <svg viewBox="0 0 24 24" className={`size-5 ${on ? "text-neutral-100" : "text-neutral-600"}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{!on && <path d="M4 4l16 16" />}</svg>
                    <span className={on ? "" : "text-neutral-500"}>{n}</span>
                    <span className="ml-auto text-[12px] text-neutral-500">{kind}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {tab === "mixer" && (
            <Panel title="Mixeur audio">
              <div className="flex items-end justify-around px-3 pb-3 pt-4">
                {MIX.map(([n, lvl, knob]) => (
                  <div key={n} className="flex w-[72px] flex-col items-center gap-2">
                    <div className="flex h-[170px] items-stretch gap-2">
                      <div className="relative w-2 overflow-hidden rounded-sm bg-[#1a1a1a]">
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-600 via-emerald-500 to-red-500" style={{ height: `${lvl}%` }} />
                      </div>
                      <div className="relative w-6">
                        <span className="absolute inset-x-[10px] inset-y-0 rounded-full bg-[#2a2a2a]" />
                        <span className="absolute left-0 h-3 w-6 rounded-sm bg-white" style={{ bottom: `${knob - 4}%` }} />
                      </div>
                    </div>
                    <span className="text-[12px] text-neutral-400">{n}</span>
                    <span className="rounded border border-[#2e2e2e] px-2 py-0.5 text-[11px] text-neutral-400">Muet</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
          {tab === "controls" && (
            <Panel title="Contrôles">
              <div className="space-y-2.5 p-3">
                <span className="block rounded bg-red-700 py-3 text-center text-[15px] font-medium">Arrêter le direct <span className="font-normal text-white/80">1:24:13</span></span>
                <span className="block rounded border border-[#2e2e2e] bg-[#141414] py-3 text-center text-[15px] text-neutral-200">Démarrer l&apos;enregistrement</span>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 pt-1 font-mono text-[13px]">
                  {[["Débit", "6 010 kbit/s"], ["Encodeur", "6 000 kbps"], ["Congestion", "4 %"], ["Images perdues", "0"], ["Sortie", "1920×1080"]].map(([a, b]) => (
                    <div key={a} className="contents">
                      <dt className="text-neutral-500">{a}</dt>
                      <dd className="text-right text-neutral-100">{b}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Panel>
          )}
        </div>

        {/* Barre d'onglets du bas */}
        <nav className="absolute inset-x-0 bottom-0 grid h-[84px] grid-cols-4 border-t border-[#262626] bg-black px-1 pt-1.5">
          {([["scenes", "Scènes"], ["sources", "Sources"], ["mixer", "Mixer"], ["controls", "Contrôles"]] as const).map(([id, t]) => (
            <span key={id} className={`relative flex flex-col items-center gap-1 pt-1.5 text-[11px] ${tab === id ? "text-white" : "text-neutral-500"}`}>
              {tab === id && <span className="absolute inset-x-8 -top-1.5 h-0.5 rounded-full bg-white" />}
              <Icon id={id} />
              {t}
            </span>
          ))}
        </nav>
        <span className="absolute bottom-2 left-1/2 h-1 w-[130px] -translate-x-1/2 rounded-full bg-white/70" />
      </div>
    </div>
  );
}
