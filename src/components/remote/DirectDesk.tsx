"use client";

import { useEffect, useRef, useState } from "react";
import { DkButton, StatusBadge, Toggle } from "../dashboard/kit";
import LivePanel from "./LivePanel";
import MixerPanel from "./MixerPanel";
import MultistreamPanel, { detectPlatform, PlatformLogo } from "./MultistreamPanel";
import ProgramView from "./ProgramView";
import ScenesPanel from "./ScenesPanel";
import SourcesPanel from "./SourcesPanel";
import { clock, cx, Select, type ConfirmAsk } from "./ui";
import type { Obs } from "./useObs";

// Direct, grand écran : barre d'état, scènes + aperçu, gestion des entrées, panneau à onglets (audio, sources, destinations).
// Les actions rares (redémarrer OBS, relance auto, reprise du direct) sont dans le menu « ⋯ ».

type Panel = "mixer" | "sources" | "multi" | "live";

export function DirectBar({ o, onLive, onSettings, setAsk }: { o: Obs; onLive: () => void; onSettings: () => void; setAsk: (a: ConfirmAsk) => void }) {
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const s = o.guardian.status ?? {};
  const outputs = o.ms?.outputs ?? [];
  const main = o.ms?.main?.configured ? o.ms.main : null;
  const platforms = [...(main ? [detectPlatform(main.service, main.server)] : []), ...outputs.map((x) => x.service)].filter((p, i, a) => a.indexOf(p) === i);
  const count = outputs.length + (main ? 1 : 0);
  const off = !o.ready || !o.canLive;
  const protectionOn = !!o.roles?.enabled;

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  async function guard(method: string, params?: Record<string, unknown>) {
    setError("");
    try {
      await o.call(method, params);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const item = "flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left text-[14px] hover:bg-foreground/[0.06] disabled:opacity-40";

  return (
    <div className="dk-card mx-4 mt-4 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 !p-4">
      <div className="flex min-w-0 items-center gap-3">
        <StatusBadge tone={o.streaming ? "ok" : o.ready ? "neutral" : "warn"}>{o.streaming ? "En direct" : o.ready ? "Hors direct" : "Connexion…"}</StatusBadge>
        {o.streaming && <span className="dk-mono text-[14px] text-foreground">{clock(o.stats?.streamMs ?? 0)}</span>}
      </div>
      {platforms.length > 0 && (
        <ul className="flex items-center gap-1.5" aria-label="Destinations">
          {platforms.map((p) => (
            <li key={p}><PlatformLogo id={p} size={24} /></li>
          ))}
        </ul>
      )}
      <p className="text-[14px] text-muted">{count} destination{count > 1 ? "s" : ""} sélectionnée{count > 1 ? "s" : ""}</p>
      <label className="ml-auto flex items-center gap-3 text-[14px] text-muted">
        Protection contre les coupures
        <Toggle label="Protection contre les coupures" checked={protectionOn} disabled={!o.roles || off} onChange={(v) => (v && !o.roles?.scene ? o.enableAuto() : o.saveRoles({ enabled: v }))} />
      </label>
      {o.owner && <DkButton disabled={!o.ready} onClick={onSettings}>Paramètres OBS</DkButton>}
      <DkButton tone={o.streaming ? "danger" : "primary"} disabled={off || o.streamBusy} onClick={onLive}>
        {o.streamBusy ? (o.streaming ? "Arrêt…" : "Démarrage…") : o.streaming ? "Terminer le stream" : "Passer en direct"}
      </DkButton>
      {o.guardian.online && o.owner && (
        <div ref={box} className="relative">
          <DkButton icon aria-label="Plus d'actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>⋯</DkButton>
          {menu && (
            <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-[var(--dk-radius-sm)] border border-line bg-background py-1 shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
              <button type="button" role="menuitem" className={item} onClick={() => { setMenu(false); setAsk({ title: "Redémarrer OBS ?", text: "OBS se ferme puis se rouvre. Le direct est repris s'il était actif et que la reprise est activée.", ok: "Redémarrer OBS", danger: true, run: () => void guard("guardian.restartObs") }); }}>
                Redémarrer OBS
              </button>
              <button type="button" role="menuitemcheckbox" aria-checked={s.watch === true} className={item} onClick={() => void guard("guardian.setWatch", { enabled: s.watch !== true })}>
                Relance auto <span className="dk-mono text-muted">{s.watch === true ? "activée" : "coupée"}</span>
              </button>
              <button type="button" role="menuitemcheckbox" aria-checked={s.resume === true} className={item} onClick={() => void guard("guardian.setResume", { enabled: s.resume !== true })}>
                Reprise du direct <span className="dk-mono text-muted">{s.resume === true ? "activée" : "coupée"}</span>
              </button>
              {error && <p role="alert" className="px-4 py-2 text-[13px]" style={{ color: "var(--dk-amber)" }}>{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Courbe de débit des dernières minutes (un relevé par mise à jour des mesures d'OBS). */
function BitrateChart({ points }: { points: number[] }) {
  const w = 600;
  const h = 120;
  if (points.length < 2) return <div className="grid h-[120px] place-items-center text-[13px] text-muted">Le débit s&apos;affiche dès que le direct démarre.</div>;
  const max = Math.max(...points, 1) * 1.1;
  const d = points.map((v, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Débit en kbit/s" className="h-[120px] w-full">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="var(--dk-blue)" opacity="0.12" />
      <path d={d} fill="none" stroke="var(--dk-blue)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Inputs({ o }: { o: Obs }) {
  const s = o.stats;
  const [history, setHistory] = useState<number[]>([]);
  const kbps = o.streaming ? (s?.kbps ?? null) : null;
  useEffect(() => {
    if (kbps == null) return;
    const t = setTimeout(() => setHistory((h) => [...h.slice(-119), kbps]), 0);
    return () => clearTimeout(t);
  }, [kbps, s?.streamMs]);
  const loss = s && s.total > 0 ? (s.dropped / s.total) * 100 : 0;
  const received = o.fluxName !== "";
  const online = o.ready && received;
  const cells: [string, string, boolean?][] = [
    ["Débit", o.streaming && s?.kbps != null ? `${s.kbps} kbit/s` : "-"],
    ["Latence", o.latency != null ? `${o.latency} ms` : "-"],
    ["Images perdues", o.streaming && s ? `${loss.toFixed(1)} %` : "-", loss > 2],
  ];
  return (
    <section aria-label="Gestion des entrées" className="dk-card">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="text-[16px] text-foreground">Gestion des entrées</h2>
        <StatusBadge tone={online ? "ok" : "warn"}>{online ? "En ligne" : o.noFluxSource ? "Aucun flux dans OBS" : "Aucun flux reçu"}</StatusBadge>
        {received && <span className="dk-mono text-[13px] text-muted">{o.fluxName}</span>}
        {o.noFluxSource && !o.guest && <DkButton className="!h-8" disabled={o.fixing} onClick={() => void o.fixFlux()}>{o.fixing ? "Correction…" : "Corriger"}</DkButton>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <dl className="grid grid-cols-3 gap-4 lg:grid-cols-1">
          {cells.map(([label, value, warn]) => (
            <div key={label}>
              <dt className="dk-label">{label}</dt>
              <dd className="dk-mono mt-1 text-[20px]" style={{ color: warn ? "var(--dk-amber)" : undefined }}>{value}</dd>
            </div>
          ))}
        </dl>
        <BitrateChart points={history} />
      </div>
      {!o.guest && (
        <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <Select label="Profil OBS" value={o.profiles.current} options={o.profiles.list} placeholder={null} disabled={!o.ready || !o.canLive || o.profiles.list.length === 0} onChange={o.setProfile} />
          <Select label="Collection de scènes" value={o.collections.current} options={o.collections.list} placeholder={null} disabled={!o.ready || !o.canLive || o.collections.list.length === 0} onChange={o.setCollection} />
        </div>
      )}
    </section>
  );
}

export default function DirectDesk({ o, onEdit, onLive, onSettings }: { o: Obs; onEdit: (e: "props" | "filters") => void; onLive: () => void; onSettings: () => void }) {
  const [panel, setPanel] = useState<Panel>("mixer");
  const tabs: [Panel, string][] = [["mixer", "Mélangeur audio"], ["sources", "Sources"], ["multi", "Destinations"], ["live", "Enregistrement"]];
  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-6 p-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ScenesPanel o={o} className="h-[26rem]" />
        <ProgramView o={o} className="h-[26rem]" />
      </div>
      <Inputs o={o} />
      <section aria-label="Panneaux">
        <div role="tablist" aria-label="Panneaux" className="dk-tabs mb-4">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={panel === id} onClick={() => setPanel(id)} className="dk-tab">{label}</button>
          ))}
        </div>
        <div role="tabpanel" className={cx("h-80 min-h-0")}>
          {panel === "mixer" && <MixerPanel o={o} className="h-full" />}
          {panel === "sources" && <SourcesPanel o={o} onEdit={onEdit} className="h-full" />}
          {panel === "live" && <LivePanel o={o} onLive={onLive} onSettings={onSettings} className="h-full" />}
          {panel === "multi" && <MultistreamPanel state={o.ms} mainLive={o.streaming} call={o.call} ready={o.ready} canControl={o.canLive} canEdit={!o.guest} onChange={o.setMs} />}
        </div>
      </section>
    </div>
  );
}
