"use client";

import { memo, type ReactNode } from "react";
import { siKick, siTwitch, siYoutube } from "simple-icons";
import AnimatedNumber from "../landing/AnimatedNumber";
import RelayBox from "../landing/RelayBox";
import {
  ALERT_THRESHOLDS,
  CODECS,
  CONNECTIONS,
  DESTINATIONS,
  MODES,
  RELAY_URL,
  RESOLUTIONS,
  SCENES,
  SYSTEM,
  type ConnId,
} from "@/config/encoder-demo";
import GlassIconView from "../ui/GlassIconView";
import type { EncoderDemo, Page, Snapshot, Tab } from "./useEncoder";

// Écrans de la démo de l'Encodeur : tableau de bord complet (ordinateur 1280 x 800) et version mobile (téléphone 390 x 844).
// Tailles en pixels : chaque écran est dessiné à taille fixe puis réduit par le composant Device. Style sobre : bordures fines, pastilles vertes, chiffres mono.

const clock = (s: number) => {
  const n = Math.floor(s);
  return [Math.floor(n / 3600), Math.floor((n % 3600) / 60), n % 60].map((x) => String(x).padStart(2, "0")).join(":");
};
const STATUS_TXT = { stable: "Stable", unstable: "Instable", offline: "Coupure" } as const;
const STATUS_COLOR = { stable: "var(--ok)", unstable: "var(--warn)", offline: "var(--bad)" } as const;
const PAGES: [Page, string][] = [["overview", "Vue d'ensemble"], ["camera", "Entrée vidéo"], ["connections", "Connexions"], ["encoding", "Encodage"], ["destinations", "Destinations"], ["scenes", "Scènes"], ["alerts", "Alertes"], ["system", "Système"], ["updates", "Mises à jour"]];

const card = "rounded-[14px] border border-white/10 bg-white/[0.03]";
const btn = "inline-flex items-center justify-center rounded-[10px] border border-white/15 bg-white/[0.06] px-[14px] py-[8px] text-[13px] text-white transition-colors duration-150 hover:border-white/30 active:scale-[0.97]";
const btnPrimary = "inline-flex items-center justify-center rounded-full bg-white px-[18px] py-[9px] text-[13px] font-semibold text-black transition-transform duration-150 active:scale-[0.97]";

function Dot({ c = "var(--ok)", pulse = false }: { c?: string; pulse?: boolean }) {
  return <span className={`inline-block h-[7px] w-[7px] rounded-full ${pulse ? "pill-dot" : ""}`} style={{ background: c, ["--c" as string]: c }} aria-hidden="true" />;
}
function Pill({ children, c = "var(--ok)" }: { children: ReactNode; c?: string }) {
  return <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-[10px] py-[3px] text-[12px]"><Dot c={c} pulse />{children}</span>;
}
function Bars({ n, max = 4 }: { n: number; max?: number }) {
  return (
    <span className="inline-flex items-end gap-[2px]" aria-label={`Signal ${n} sur ${max}`}>
      {Array.from({ length: max }).map((_, i) => <span key={i} className={`w-[4px] rounded-[1px] ${i < n ? "bg-[var(--ok)]" : "bg-white/15"}`} style={{ height: 5 + i * 3 }} />)}
    </span>
  );
}
function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange} className={`relative h-[22px] w-[40px] shrink-0 rounded-full border border-white/10 transition-colors duration-200 ${on ? "bg-[var(--ok)]/70" : "bg-white/10"}`}>
      <span className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white transition-[left] duration-200 ${on ? "left-[20px]" : "left-[2px]"}`} />
    </button>
  );
}
function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex gap-[4px] rounded-full border border-white/10 bg-white/[0.04] p-[4px]">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={o.id === value} className={`rounded-full px-[14px] py-[6px] text-[13px] transition-colors duration-150 ${o.id === value ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>{o.label}</button>
      ))}
    </div>
  );
}
function Meter({ label, value, unit, warn = 80 }: { label: string; value: number; unit: string; warn?: number }) {
  const hot = value >= warn;
  return (
    <div className={`${card} p-[16px]`}>
      <div className="flex items-baseline justify-between"><span className="text-[13px] text-white/60">{label}</span><span className="font-mono text-[20px] tabular-nums"><AnimatedNumber value={value} decimals={0} /><span className="ml-[3px] text-[12px] text-white/45">{unit}</span></span></div>
      <div className="mt-[12px] h-[6px] overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, value)}%`, background: hot ? "var(--warn)" : "var(--ok)" }} /></div>
    </div>
  );
}

/** Aperçu vidéo : fond en mouvement, silhouette IRL ou scène, overlay LIVE, slate de coupure, niveaux audio. */
const EncPreview = memo(function EncPreview({ scene, live, slate, muted, seconds, scale = 1, noSignal = false }: { scene: string; live: boolean; slate: boolean; muted: boolean; seconds: number; scale?: number; noSignal?: boolean }) {
  return (
    <div className="drift-bg relative h-full w-full overflow-hidden rounded-[10px] border border-white/10" style={{ fontSize: 14 * scale }}>
      <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {scene === "live" && (
          <>
            <circle cx="122" cy="22" r="9" fill="#fff" fillOpacity="0.18" className="sun-drift" />
            <path d="M0 64 L30 46 L58 58 L96 32 L128 52 L160 40 V90 H0Z" fill="#fff" fillOpacity="0.08" />
            <g fill="#fff" fillOpacity="0.55" className="walk-bob"><circle cx="62" cy="44" r="5" /><path d="M56 52h12l3 20h-4l-2-9-2 9h-4l-2-9-2 9h-4Z" /><path d="M68 50l14-14" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.4" fill="none" /><rect x="80" y="30" width="5" height="9" rx="1" /></g>
          </>
        )}
        {scene === "chat" && [0, 1, 2, 3].map((i) => <rect key={i} x="14" y={14 + i * 14} width={60 + ((i * 23) % 50)} height="5" rx="2.5" fill="#fff" fillOpacity="0.25" />)}
      </svg>
      {scene === "brb" && <div className="absolute inset-0 grid place-items-center text-[1.5em] font-semibold">Connexion perdue, on revient</div>}
      {scene === "slate" && <div className="absolute inset-0 grid place-items-center bg-black/60 text-[1.3em] font-semibold">Le stream commence bientôt</div>}
      {live && <span className="absolute left-[0.8em] top-[0.8em] inline-flex items-center gap-[0.5em] rounded-full bg-black/60 px-[0.8em] py-[0.35em] text-[0.8em] font-semibold"><span className="live-dot" aria-hidden="true" />LIVE <span className="font-mono tabular-nums text-white/70">{clock(seconds)}</span></span>}
      <div className="absolute bottom-[0.8em] right-[0.8em] flex h-[2.4em] items-end gap-[2px]" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => <span key={i} className={`level-bar w-[4px] origin-bottom rounded-sm ${muted || !live ? "scale-y-[0.1] bg-white/25" : "bg-[var(--ok)]"}`} style={muted || !live ? { height: "100%" } : ({ height: "100%", "--p": 0.4 + ((i * 37) % 55) / 100, animationDelay: `${(i * 91) % 600}ms`, animationDuration: `${650 + ((i * 53) % 450)}ms` } as React.CSSProperties)} />)}
      </div>
      {noSignal && <div className="absolute inset-0 grid place-items-center bg-[#08080a] text-center"><div><p className="text-[1.3em] font-semibold">Aucun signal</p><p className="mt-[0.3em] text-[0.85em] text-white/55">Vérifie le câble de ta caméra.</p></div></div>}
      <div className={`absolute inset-0 grid place-items-center bg-black/80 text-center backdrop-blur-sm transition-[opacity,filter] duration-300 ${slate && !noSignal ? "opacity-100" : "pointer-events-none opacity-0 blur-sm"}`} aria-hidden={!slate}>
        <div><p className="text-[1.3em] font-semibold">Reconnexion en cours</p><p className="mt-[0.3em] text-[0.85em] text-white/60">Le direct reprend dans un instant.</p></div>
      </div>
    </div>
  );
});

/** Graphique empilé des débits par connexion + courbe du total. */
const Stacked = memo(function Stacked({ snap, order, on, w = 360, h = 150 }: { snap: Snapshot; order: ConnId[]; on: Record<ConnId, boolean>; w?: number; h?: number }) {
  const act = order.filter((i) => on[i]);
  const n = snap.totalHistory.length;
  const max = 12;
  const layers = act.map((id, li) => {
    const top = Array.from({ length: n }, (_, p) => act.slice(0, li + 1).reduce((a, k) => a + snap.history[k][p], 0));
    const bottom = Array.from({ length: n }, (_, p) => act.slice(0, li).reduce((a, k) => a + snap.history[k][p], 0));
    const X = (p: number) => (p / (n - 1)) * w;
    const Y = (v: number) => h - Math.min(1, v / max) * (h - 4) - 2;
    const d = top.map((v, p) => `${p ? "L" : "M"}${X(p)},${Y(v)}`).join(" ") + " " + bottom.map((v, p) => `L${X(n - 1 - p)},${Y(bottom[n - 1 - p])}`).join(" ") + "Z";
    return <path key={id} d={d} fill="#fff" fillOpacity={0.1 + (li % 4) * 0.07} stroke="#fff" strokeOpacity="0.25" strokeWidth="0.6" />;
  });
  return <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="Débit par connexion, empilé">{layers}</svg>;
});

const PLATFORM_ICON = { youtube: siYoutube, twitch: siTwitch, kick: siKick } as const;

function copy(text: string, d: EncoderDemo) {
  navigator.clipboard?.writeText(text).catch(() => {});
  d.actions.notify("Copié dans le presse-papier.");
}

/* ───────────── Pages de l'ordinateur ───────────── */
function Overview({ d }: { d: EncoderDemo }) {
  const { c, snap, actions: a } = d;
  const live = c.live === "on";
  return (
    <div className="grid gap-[16px]">
      <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr] gap-[12px]">
        <div className={`${card} flex items-center justify-between p-[16px]`}>
          <Pill c={STATUS_COLOR[snap.status]}>{live ? "LIVE" : "Hors ligne"} <span className="font-mono tabular-nums text-white/60">{live ? clock(snap.seconds) : "00:00:00"}</span></Pill>
          <span className="text-[12px] text-white/50">{STATUS_TXT[snap.status]}</span>
        </div>
        {[["Débit total", snap.total, "Mb/s", 1], ["Latence", snap.latency, "ms", 0], ["Perte", snap.loss, "%", 1], ["FPS", snap.fps, "", 0]].map(([k, v, u, dec]) => (
          <div key={String(k)} className={`${card} p-[16px]`}><p className="text-[12px] text-white/50">{k}</p><p className="mt-[6px] font-mono text-[24px] tabular-nums"><AnimatedNumber value={live ? Number(v) : 0} decimals={Number(dec)} /> <span className="text-[12px] text-white/45">{u}</span></p></div>
        ))}
      </div>
      <div className="grid grid-cols-[1.35fr_1fr] gap-[16px]">
        <div className={`${card} p-[12px]`}><div className="aspect-video w-full"><EncPreview scene={c.scene} live={live} slate={snap.slate} muted={c.muted} seconds={snap.seconds} noSignal={c.camera.state === "nosignal"} /></div></div>
        <div className={`${card} flex flex-col p-[16px]`}>
          <p className="text-[13px] font-semibold">Bonding</p>
          <p className="mt-[2px] text-[12px] text-white/50">{snap.note}</p>
          <div className="mt-[12px] min-h-0 flex-1"><Stacked snap={snap} order={c.order} on={c.on} /></div>
          <div className="mt-[10px] flex flex-wrap gap-[10px] text-[11px] text-white/55">{c.order.filter((i) => c.on[i]).map((i) => <span key={i}>{CONNECTIONS.find((x) => x.id === i)!.label} <span className="font-mono tabular-nums">{snap.rates[i].toFixed(1)}</span></span>)}</div>
        </div>
      </div>
      <div className="flex items-center gap-[10px]">
        <button type="button" onClick={a.toggleLive} disabled={c.live === "starting"} className={c.live === "on" ? `${btn} !border-[var(--bad)]/40 !bg-[var(--bad)]/15 text-[var(--bad)]` : btnPrimary}>{c.live === "starting" ? "Démarrage…" : c.live === "on" ? "Arrêter le direct" : "Démarrer le direct"}</button>
        <button type="button" onClick={a.toggleMute} aria-pressed={c.muted} className={btn}>{c.muted ? "Réactiver le micro" : "Couper le micro"}</button>
        <button type="button" onClick={a.triggerSlate} className={btn}>Déclencher le slate</button>
      </div>
      <div className={`${card} p-[14px]`}>
        <p className="text-[12px] text-white/50">Derniers événements</p>
        <ul className="mt-[8px] grid grid-cols-3 gap-[12px]">
          {snap.events.slice(0, 3).map((e, i) => <li key={i} className="flex items-center gap-[8px] text-[12.5px] text-white/80"><Dot c={`var(--${e.status === "ok" ? "ok" : e.status === "warn" ? "warn" : "bad"})`} /><span className="font-mono tabular-nums text-white/50">{e.time}</span><span className="truncate">{e.text}</span></li>)}
        </ul>
      </div>
    </div>
  );
}

function Camera({ d }: { d: EncoderDemo }) {
  const { c, snap, actions: a } = d;
  const cam = c.camera;
  const ok = cam.state === "connected";
  return (
    <div className="grid grid-cols-[0.8fr_1.2fr] gap-[16px]">
      <div className={`${card} p-[20px]`}>
        <div className="flex items-center justify-between"><p className="text-[15px] font-semibold">Caméra</p><Pill c={ok ? "var(--ok)" : "var(--bad)"}>{ok ? "Branchée" : "Aucun signal"}</Pill></div>
        <dl className="mt-[16px] grid grid-cols-2 gap-[14px] text-[13px]">
          <div><dt className="text-white/50">Entrée</dt><dd className="mt-[3px] font-mono text-[16px]">{ok ? "USB-C" : "—"}</dd></div>
          <div><dt className="text-white/50">Signal détecté</dt><dd className="mt-[3px] font-mono text-[16px] tabular-nums">{ok ? cam.detected : "—"}</dd></div>
        </dl>
        <div className="mt-[18px]">
          <div className="flex items-center justify-between text-[12px] text-white/50"><span>Niveau audio entrant</span><span className="font-mono tabular-nums">{ok && !c.muted ? cam.audioLevel : 0} %</span></div>
          <div className="mt-[8px] h-[8px] overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${ok && !c.muted ? cam.audioLevel : 0}%`, background: "linear-gradient(90deg,var(--ok) 70%,var(--warn) 92%,var(--bad))" }} /></div>
        </div>
        <div className="mt-[20px] flex flex-wrap gap-[8px]">
          <button type="button" onClick={a.testCamera} disabled={cam.test === "testing"} className={btnPrimary}>{cam.test === "testing" ? "Test en cours…" : "Tester le signal"}</button>
          <button type="button" onClick={() => a.setCameraConnected(!ok)} className={btn}>{ok ? "Simuler un câble débranché" : "Rebrancher la caméra"}</button>
        </div>
        {!ok && (
          <div className="mt-[18px] flex items-center gap-[14px] rounded-[12px] border border-[var(--bad)]/30 bg-[var(--bad)]/10 p-[14px]">
            <GlassIconView name="docs" size={48} float={false} />
            <p className="text-[13px] leading-snug"><span className="block font-semibold">Aucun signal</span><span className="text-white/65">Vérifie le câble de ta caméra, puis teste de nouveau le signal.</span></p>
          </div>
        )}
      </div>
      <div className={`${card} p-[14px]`}>
        <div className="mb-[10px] flex items-center justify-between"><p className="text-[13px] font-semibold">Aperçu de la caméra</p><Segmented value={cam.framing} options={[{ id: "frame", label: "Cadrage" }, { id: "full", label: "Plein écran" }]} onChange={a.setFraming} /></div>
        <div className="relative aspect-video w-full">
          <EncPreview scene="live" live={c.live === "on"} slate={false} muted={c.muted} seconds={snap.seconds} noSignal={!ok} />
          {ok && cam.framing === "frame" && <span aria-hidden="true" className="pointer-events-none absolute inset-[10%] rounded-[6px] border border-dashed border-white/40" />}
        </div>
      </div>
    </div>
  );
}

function Connections({ d }: { d: EncoderDemo }) {
  const { c, snap, actions: a } = d;
  return (
    <div className="grid grid-cols-2 gap-[14px]">
      {c.order.map((id, rank) => {
        const def = CONNECTIONS.find((x) => x.id === id)!;
        const on = c.on[id];
        return (
          <div key={id} className={`${card} p-[16px] ${on ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between">
              <div><p className="text-[15px] font-semibold">{def.label}</p><p className="text-[12px] text-white/50">{def.operator}</p></div>
              <Toggle on={on} onChange={() => a.toggleConn(id)} label={`${def.label} : ${on ? "couper" : "rétablir"}`} />
            </div>
            <div className="mt-[14px] flex items-center justify-between"><Bars n={snap.signal[id]} /><Pill c={on ? (snap.signal[id] <= 1 ? "var(--warn)" : "var(--ok)") : "var(--bad)"}>{on ? (snap.signal[id] <= 1 ? "Faible" : "Connecté") : "Coupé"}</Pill></div>
            <div className="mt-[14px] grid grid-cols-2 gap-[8px] font-mono text-[18px] tabular-nums"><p><AnimatedNumber value={on ? snap.rates[id] : 0} decimals={1} /><span className="ml-[4px] text-[11px] text-white/45">Mb/s</span></p><p><AnimatedNumber value={on ? snap.latencies[id] : 0} decimals={0} /><span className="ml-[4px] text-[11px] text-white/45">ms</span></p></div>
            <div className="mt-[14px] flex items-center justify-between border-t border-white/10 pt-[10px] text-[12px] text-white/55">
              <span>Priorité {rank + 1}</span>
              <span className="flex gap-[6px]"><button type="button" onClick={() => a.moveConn(id, -1)} disabled={rank === 0} aria-label={`Monter la priorité de ${def.label}`} className={`${btn} !px-[10px] !py-[3px] disabled:opacity-30`}>↑</button><button type="button" onClick={() => a.moveConn(id, 1)} disabled={rank === c.order.length - 1} aria-label={`Baisser la priorité de ${def.label}`} className={`${btn} !px-[10px] !py-[3px] disabled:opacity-30`}>↓</button></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Encoding({ d }: { d: EncoderDemo }) {
  const { c, snap, actions: a } = d;
  const res = RESOLUTIONS.find((r) => r.id === c.res)!;
  const ok = snap.total >= res.need;
  return (
    <div className="grid grid-cols-[1.2fr_1fr] gap-[16px]">
      <div className={`${card} grid gap-[20px] p-[20px]`}>
        <div><p className="mb-[8px] text-[12px] text-white/50">Résolution et images par seconde</p><Segmented value={c.res} options={RESOLUTIONS.map((r) => ({ id: r.id, label: r.label }))} onChange={(res) => a.setEncoding({ res })} /></div>
        <div><p className="mb-[8px] text-[12px] text-white/50">Mode</p><Segmented value={c.mode} options={MODES.map((m) => ({ id: m.id, label: m.label }))} onChange={(mode) => a.setEncoding({ mode })} /></div>
        <div><p className="mb-[8px] text-[12px] text-white/50">Codec</p><Segmented value={c.codec} options={CODECS.map((x) => ({ id: x, label: x }))} onChange={(codec) => a.setEncoding({ codec })} /></div>
        <div>
          <div className="mb-[8px] flex items-baseline justify-between text-[12px] text-white/50"><span>Débit maximum</span><span className="font-mono text-[16px] tabular-nums text-white">{c.maxBitrate.toFixed(1).replace(".", ",")} Mb/s</span></div>
          <input type="range" min={2} max={12} step={0.5} value={c.maxBitrate} onChange={(e) => a.setEncoding({ maxBitrate: Number(e.target.value) })} aria-label="Débit maximum" className="w-full accent-white" />
        </div>
      </div>
      <div className="grid content-start gap-[16px]">
        <div className={`${card} p-[20px]`}><p className="text-[12px] text-white/50">Coût estimé en données</p><p className="mt-[8px] font-mono text-[34px] tabular-nums"><AnimatedNumber value={snap.dataPerHour} decimals={1} /> <span className="text-[14px] text-white/45">Go / heure</span></p><p className="mt-[6px] text-[12px] text-white/50">Selon le débit réellement utilisé.</p></div>
        <div className={`${card} p-[20px]`}>
          <p className="text-[12px] text-white/50">Débit nécessaire pour {res.label}</p>
          <p className="mt-[6px] font-mono text-[22px] tabular-nums">{res.need} Mb/s <span className="text-[13px] text-white/45">· disponible {snap.total.toFixed(1).replace(".", ",")}</span></p>
          <div className="mt-[10px]"><Pill c={ok ? "var(--ok)" : "var(--warn)"}>{ok ? "Débit suffisant" : "Débit juste : l'image peut saccader"}</Pill></div>
        </div>
        <div className={`${card} grid gap-[14px] p-[20px]`}>
          <div className="flex items-center justify-between"><p className="text-[13px] font-semibold">Audio</p><button type="button" onClick={a.toggleMute} aria-pressed={c.muted} className={btn}>{c.muted ? "Réactiver le micro" : "Couper le micro"}</button></div>
          <div>
            <div className="mb-[6px] flex items-baseline justify-between text-[12px] text-white/50"><span>Gain d&apos;entrée</span><span className="font-mono text-[14px] tabular-nums text-white">{c.gain > 0 ? "+" : ""}{c.gain} dB</span></div>
            <input type="range" min={-12} max={12} step={1} value={c.gain} onChange={(e) => a.setAudio({ gain: Number(e.target.value) })} aria-label="Gain d'entrée" className="w-full accent-white" />
          </div>
          <div className="flex items-center justify-between text-[13px]"><span>Réduction du bruit de fond<span className="block text-[12px] text-white/50">Noise gate sur l&apos;entrée caméra</span></span><Toggle on={c.gate} onChange={() => a.setAudio({ gate: !c.gate })} label="Réduction du bruit de fond" /></div>
        </div>
      </div>
    </div>
  );
}

function Destinations({ d }: { d: EncoderDemo }) {
  const { c, actions: a } = d;
  return (
    <div className="grid gap-[14px]">
      <div className="grid grid-cols-3 gap-[14px]">
        {DESTINATIONS.map((x) => {
          const on = c.dest[x.id];
          const shown = c.reveal[x.id];
          return (
            <div key={x.id} className={`${card} p-[18px]`}>
              <div className="flex items-center justify-between"><span className="flex items-center gap-[10px] text-[16px] font-semibold"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d={PLATFORM_ICON[x.id].path} /></svg>{x.name}</span><Pill c={on ? "var(--ok)" : "#5b5f66"}>{on ? "Connecté" : "Non connecté"}</Pill></div>
              <p className="mt-[14px] text-[12px] text-white/50">Clé de stream</p>
              <p className="mt-[4px] truncate font-mono text-[13px] tabular-nums">{on ? (shown ? x.key : "••••••••••••••••") : "Aucune clé"}</p>
              <div className="mt-[14px] flex gap-[8px]">
                <button type="button" onClick={() => a.toggleDest(x.id)} className={on ? btn : btnPrimary}>{on ? "Déconnecter" : "Connecter"}</button>
                {on && <button type="button" onClick={() => a.toggleReveal(x.id)} className={btn}>{shown ? "Masquer" : "Révéler"}</button>}
                {on && <button type="button" onClick={() => copy(x.key, d)} className={btn}>Copier</button>}
              </div>
            </div>
          );
        })}
      </div>
      <div className={`${card} p-[18px]`}>
        <p className="text-[13px] font-semibold">Relais SRTLA</p>
        <div className="mt-[10px] flex items-center justify-between gap-[12px] rounded-[10px] border border-white/10 bg-black/40 px-[14px] py-[10px]"><code className="truncate font-mono text-[13px]">{RELAY_URL}</code><button type="button" onClick={() => copy(RELAY_URL, d)} className={btn}>Copier</button></div>
      </div>
    </div>
  );
}

function SceneThumb({ id }: { id: string }) {
  return (
    <div className="drift-bg relative h-full w-full overflow-hidden rounded-[8px]">
      <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {id === "live" && <><path d="M0 64 L30 46 L58 58 L96 32 L128 52 L160 40 V90 H0Z" fill="#fff" fillOpacity="0.1" /><circle cx="62" cy="44" r="5" fill="#fff" fillOpacity="0.55" /><path d="M56 52h12l3 20h-4l-2-9-2 9h-4l-2-9-2 9h-4Z" fill="#fff" fillOpacity="0.55" /></>}
        {id === "brb" && <rect x="40" y="40" width="80" height="6" rx="3" fill="#fff" fillOpacity="0.45" />}
        {id === "slate" && <><rect x="30" y="30" width="100" height="30" rx="6" fill="#fff" fillOpacity="0.18" /><rect x="50" y="42" width="60" height="6" rx="3" fill="#fff" fillOpacity="0.5" /></>}
        {id === "chat" && [0, 1, 2, 3].map((i) => <rect key={i} x="14" y={14 + i * 16} width={60 + ((i * 23) % 60)} height="6" rx="3" fill="#fff" fillOpacity="0.35" />)}
      </svg>
    </div>
  );
}

function Scenes({ d }: { d: EncoderDemo }) {
  const { c, actions: a } = d;
  return (
    <div className="grid grid-cols-2 gap-[16px]">
      {SCENES.map((s) => (
        <button key={s.id} type="button" onClick={() => a.switchScene(s.id)} aria-pressed={c.scene === s.id} className={`${card} flex items-center gap-[16px] p-[14px] text-left transition-colors duration-150 ${c.scene === s.id ? "!border-white/40 !bg-white/[0.08]" : "hover:border-white/25"}`}>
          <span className="block aspect-video w-[200px] shrink-0"><SceneThumb id={s.id} /></span>
          <span className="flex-1"><span className="block text-[16px] font-semibold">{s.name}</span><span className="mt-[4px] block text-[12px] text-white/50">Raccourci <kbd className="rounded-[4px] border border-white/20 px-[6px] py-[1px] font-mono text-[11px]">{s.key}</kbd></span>{c.scene === s.id && <span className="mt-[10px] inline-block"><Pill>En antenne</Pill></span>}</span>
        </button>
      ))}
    </div>
  );
}

function Alerts({ d }: { d: EncoderDemo }) {
  const { c, snap, actions: a } = d;
  return (
    <div className="grid grid-cols-[0.8fr_1.2fr] gap-[16px]">
      <div className={`${card} p-[18px]`}>
        <p className="text-[13px] font-semibold">Seuils d&apos;alerte</p>
        <ul className="mt-[12px] divide-y divide-white/10">
          {ALERT_THRESHOLDS.map((x) => <li key={x.id} className="flex items-center justify-between py-[12px]"><span><span className="block text-[14px]">{x.label}</span><span className="text-[12px] text-white/50">{x.detail}</span></span><Toggle on={c.alerts[x.id]} onChange={() => a.toggleAlert(x.id)} label={x.label} /></li>)}
        </ul>
      </div>
      <div className={`${card} p-[18px]`}>
        <p className="text-[13px] font-semibold">Historique</p>
        <table className="mt-[10px] w-full text-left text-[13px]"><thead><tr className="text-[11px] text-white/45"><th className="pb-[8px] font-normal">Heure</th><th className="pb-[8px] font-normal">Événement</th><th className="pb-[8px] text-right font-normal">Statut</th></tr></thead>
          <tbody>{snap.events.slice(0, 8).map((e, i) => <tr key={i} className="border-t border-white/10"><td className="py-[9px] font-mono tabular-nums text-white/60">{e.time}</td><td className="py-[9px]">{e.text}</td><td className="py-[9px] text-right"><Pill c={`var(--${e.status === "ok" ? "ok" : e.status === "warn" ? "warn" : "bad"})`}>{e.status === "ok" ? "OK" : e.status === "warn" ? "Alerte" : "Critique"}</Pill></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function System({ d }: { d: EncoderDemo }) {
  const { c, snap, actions: a } = d;
  const led = (id: ConnId) => (!c.on[id] ? "off" : snap.signal[id] <= 1 ? "warn" : "ok") as "ok" | "warn" | "off";
  return (
    <div className="grid grid-cols-[1.25fr_1fr] gap-[16px]">
      <div className="grid grid-cols-3 gap-[12px]">
        <Meter label="Température" value={snap.system.temp} unit="°C" warn={70} />
        <Meter label="Processeur" value={snap.system.cpu} unit="%" />
        <Meter label="Carte graphique" value={snap.system.gpu} unit="%" />
        <Meter label="Mémoire" value={snap.system.ram} unit="%" />
        <Meter label="Stockage" value={snap.system.storage} unit="%" />
        <Meter label="Batterie" value={snap.system.battery} unit="%" warn={101} />
        <div className={`${card} col-span-3 flex items-center justify-between p-[18px]`}>
          <div><p className="text-[12px] text-white/50">Version du firmware</p><p className="mt-[4px] font-mono text-[22px] tabular-nums">{c.update.state === "done" ? SYSTEM.nextFirmware : SYSTEM.firmware}</p></div>
          <button type="button" onClick={a.askRestart} className={btn}>Redémarrer</button>
        </div>
      </div>
      <div className={`${card} flex flex-col justify-center p-[16px]`}>
        <RelayBox live={c.live === "on" && !snap.slate} leds={{ wifi: led("wifi"), eth: led("eth"), cell: led("cell"), usb: led("usb") }} />
        <p className="mt-[8px] text-center text-[12px] text-white/50">Les voyants reflètent l&apos;état réel des connexions.</p>
      </div>
    </div>
  );
}

function Updates({ d }: { d: EncoderDemo }) {
  const { c, actions: a } = d;
  const u = c.update;
  return (
    <div className={`${card} max-w-[640px] p-[24px]`}>
      <p className="text-[12px] text-white/50">Version actuelle</p>
      <p className="mt-[4px] font-mono text-[22px] tabular-nums">{u.state === "done" ? SYSTEM.nextFirmware : SYSTEM.firmware}</p>
      {u.state === "done" ? (
        <div className="mt-[18px]"><Pill>À jour</Pill></div>
      ) : (
        <>
          <div className="mt-[18px] flex items-center gap-[10px]"><Pill c="var(--warn)">Mise à jour disponible</Pill><span className="font-mono text-[13px] tabular-nums text-white/70">{SYSTEM.nextFirmware}</span></div>
          <ul className="mt-[14px] space-y-[6px] text-[13px] text-white/65"><li>+ Bonding plus rapide à la reconnexion</li><li>+ Nouveaux seuils d&apos;alerte</li><li>+ Correctifs de stabilité</li></ul>
          <div className="mt-[18px]">
            {u.state === "installing" ? (
              <div><div className="h-[8px] overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--ok)] transition-[width] duration-300" style={{ width: `${u.progress}%` }} /></div><p className="mt-[8px] font-mono text-[12px] tabular-nums text-white/60">Installation… {u.progress} %</p></div>
            ) : (
              <button type="button" onClick={a.startUpdate} className={btnPrimary}>Installer la mise à jour</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Tableau de bord de l'ordinateur : barre latérale, titre, page courante en fondu + flou, toast et fenêtre de redémarrage. */
export function EncoderMacUI({ d }: { d: EncoderDemo }) {
  const { c, actions: a } = d;
  const pages: Record<Page, ReactNode> = { overview: <Overview d={d} />, camera: <Camera d={d} />, connections: <Connections d={d} />, encoding: <Encoding d={d} />, destinations: <Destinations d={d} />, scenes: <Scenes d={d} />, alerts: <Alerts d={d} />, system: <System d={d} />, updates: <Updates d={d} /> };
  return (
    <div className="relative flex h-full w-full bg-[#050506] text-[14px] leading-tight text-white">
      <aside className="flex w-[232px] shrink-0 flex-col border-r border-white/10 bg-[#0a0a0b] p-[14px]">
        <div className="rounded-[12px] border border-white/10 bg-white/[0.04] p-[10px]">
          <div className="flex items-center gap-[10px]"><span className="grid h-[30px] w-[30px] place-items-center rounded-[8px] bg-gradient-to-br from-violet-500 to-pink-500 text-[13px] font-semibold">S</span><span className="text-[13px] font-semibold leading-tight">SYXTEE Encodeur<br /><span className="font-normal text-white/50">Studio</span></span></div>
          <div className="mt-[10px]"><Pill>En ligne</Pill></div>
        </div>
        <nav aria-label="Tableau de bord" className="mt-[16px] space-y-[2px]">
          {PAGES.map(([id, label]) => <button key={id} type="button" onClick={() => a.setPage(id)} aria-current={c.page === id ? "page" : undefined} className={`flex w-full items-center rounded-[10px] px-[12px] py-[9px] text-left text-[14px] transition-colors duration-150 ${c.page === id ? "bg-white/[0.09] text-white" : "text-white/60 hover:text-white"}`}>{label}</button>)}
        </nav>
        <button type="button" onClick={a.reset} className="mt-auto text-left text-[12px] text-white/40 hover:text-white/70">Réinitialiser la démo</button>
      </aside>
      <main className="relative min-w-0 flex-1 overflow-hidden p-[28px]">
        <h3 className="mb-[18px] text-[30px] font-medium tracking-[-0.02em]">{PAGES.find(([id]) => id === c.page)?.[1]}</h3>
        <div key={c.page} className="page-in">{pages[c.page]}</div>
        {c.toast && <p key={c.toast.n} role="status" className="rise absolute bottom-[20px] right-[24px] flex items-center gap-[10px] rounded-[12px] border border-white/15 bg-[#111113] px-[16px] py-[11px] text-[13px] shadow-lg"><Dot c={c.toast.tone === "error" ? "var(--bad)" : "var(--ok)"} />{c.toast.text}</p>}
      </main>
      {c.restart !== "idle" && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 backdrop-blur-sm">
          <div className="w-[420px] rounded-[18px] border border-white/15 bg-[#0e0e10] p-[24px]">
            {c.restart === "confirm" ? (
              <>
                <p className="text-[20px] font-semibold">Redémarrer l&apos;Encodeur ?</p>
                <p className="mt-[8px] text-[14px] text-white/60">Le direct s&apos;arrête quelques secondes, puis reprend tout seul.</p>
                <div className="mt-[20px] flex gap-[10px]"><button type="button" onClick={a.reboot} className={btnPrimary}>Redémarrer</button><button type="button" onClick={a.cancelRestart} className={btn}>Annuler</button></div>
              </>
            ) : (
              <><p className="text-[20px] font-semibold">Redémarrage en cours…</p><div className="mt-[16px] h-[6px] overflow-hidden rounded-full bg-white/10"><div className="h-full w-full origin-left animate-pulse rounded-full bg-[var(--ok)]" /></div></>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Version mobile ───────────── */
const TABS: [Tab, string][] = [["live", "Live"], ["connections", "Connexions"], ["destinations", "Destinations"], ["system", "Système"]];

export function EncoderPhoneUI({ d }: { d: EncoderDemo }) {
  const { c, snap, actions: a } = d;
  const live = c.live === "on";
  const body: Record<Tab, ReactNode> = {
    live: (
      <div className="grid gap-[12px]">
        <div className="aspect-video w-full"><EncPreview scene={c.scene} live={live} slate={snap.slate} muted={c.muted} seconds={snap.seconds} scale={0.8} noSignal={c.camera.state === "nosignal"} /></div>
        <div className="grid grid-cols-3 gap-[8px] text-center">{[["Débit", snap.total, "Mb/s", 1], ["Latence", snap.latency, "ms", 0], ["Perte", snap.loss, "%", 1]].map(([k, v, u, dec]) => <div key={String(k)} className={`${card} py-[10px]`}><p className="text-[11px] text-white/50">{k}</p><p className="font-mono text-[16px] tabular-nums"><AnimatedNumber value={live ? Number(v) : 0} decimals={Number(dec)} /> <span className="text-[10px] text-white/45">{u}</span></p></div>)}</div>
        <div className={`${card} h-[110px] p-[10px]`}><Stacked snap={snap} order={c.order} on={c.on} w={320} h={90} /></div>
        <div className="grid grid-cols-2 gap-[8px]">{SCENES.map((s) => <button key={s.id} type="button" onClick={() => a.switchScene(s.id)} aria-pressed={c.scene === s.id} className={`${card} py-[10px] text-[14px] ${c.scene === s.id ? "!border-white/40 !bg-white/[0.09]" : "text-white/70"}`}>{s.name}</button>)}</div>
        <div className="grid grid-cols-[1fr_auto] gap-[8px]"><button type="button" onClick={a.toggleLive} disabled={c.live === "starting"} className={`rounded-full py-[13px] text-[15px] font-semibold ${live ? "bg-[var(--bad)]/20 text-[var(--bad)]" : "bg-white text-black"}`}>{c.live === "starting" ? "Démarrage…" : live ? "Arrêter le direct" : "Démarrer le direct"}</button><button type="button" onClick={a.toggleMute} aria-pressed={c.muted} className={`${btn} !rounded-full !px-[16px]`}>{c.muted ? "Muet" : "Micro"}</button></div>
      </div>
    ),
    connections: (
      <ul className="grid gap-[8px]">{c.order.map((id) => { const def = CONNECTIONS.find((x) => x.id === id)!; const on = c.on[id]; return <li key={id} className={`${card} flex items-center gap-[10px] p-[12px] ${on ? "" : "opacity-60"}`}><span className="flex-1"><span className="block text-[14px] font-semibold">{def.label}</span><span className="font-mono text-[12px] tabular-nums text-white/55">{on ? snap.rates[id].toFixed(1) : "0,0"} Mb/s · {on ? snap.latencies[id] : 0} ms</span></span><Bars n={snap.signal[id]} /><Toggle on={on} onChange={() => a.toggleConn(id)} label={`${def.label}`} /></li>; })}</ul>
    ),
    destinations: (
      <div className="grid gap-[8px]">{DESTINATIONS.map((x) => { const on = c.dest[x.id]; return <div key={x.id} className={`${card} p-[12px]`}><div className="flex items-center justify-between"><span className="flex items-center gap-[8px] text-[15px] font-semibold"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d={PLATFORM_ICON[x.id].path} /></svg>{x.name}</span><Pill c={on ? "var(--ok)" : "#5b5f66"}>{on ? "Connecté" : "Non connecté"}</Pill></div><p className="mt-[8px] truncate font-mono text-[12px] text-white/60">{on ? (c.reveal[x.id] ? x.key : "••••••••••••") : "Aucune clé"}</p><div className="mt-[10px] flex gap-[6px]"><button type="button" onClick={() => a.toggleDest(x.id)} className={on ? btn : btnPrimary}>{on ? "Déconnecter" : "Connecter"}</button>{on && <button type="button" onClick={() => a.toggleReveal(x.id)} className={btn}>{c.reveal[x.id] ? "Masquer" : "Révéler"}</button>}</div></div>; })}</div>
    ),
    system: (
      <div className="grid gap-[8px]"><Meter label="Température" value={snap.system.temp} unit="°C" warn={70} /><Meter label="Batterie" value={snap.system.battery} unit="%" warn={101} /><Meter label="Processeur" value={snap.system.cpu} unit="%" /><div className={`${card} flex items-center justify-between p-[14px]`}><span><span className="block text-[12px] text-white/50">Firmware</span><span className="font-mono text-[16px]">{c.update.state === "done" ? SYSTEM.nextFirmware : SYSTEM.firmware}</span></span><button type="button" onClick={a.askRestart} className={btn}>Redémarrer</button></div></div>
    ),
  };
  return (
    <div className="relative flex h-full w-full flex-col bg-[#050506] pt-[56px] text-[15px] leading-tight text-white">
      <div className="flex items-center justify-between px-[18px] pb-[12px]"><span className="text-[17px] font-semibold tracking-tight">SYXTEE Encodeur</span><Pill>En ligne</Pill></div>
      <div className="min-h-0 flex-1 overflow-hidden px-[18px]">
        <div key={c.tab} className="page-in">{body[c.tab]}</div>
      </div>
      {c.toast && <p key={c.toast.n} role="status" className="rise absolute inset-x-[18px] bottom-[96px] flex items-center gap-[8px] rounded-[12px] border border-white/15 bg-[#111113] px-[14px] py-[10px] text-[13px]"><Dot />{c.toast.text}</p>}
      <nav aria-label="Navigation mobile" className="grid grid-cols-4 gap-[4px] border-t border-white/10 bg-[#0a0a0b] px-[8px] pb-[22px] pt-[8px]">
        {TABS.map(([id, label]) => <button key={id} type="button" onClick={() => a.setTab(id)} aria-current={c.tab === id ? "page" : undefined} className={`rounded-[10px] py-[9px] text-[11.5px] ${c.tab === id ? "bg-white/[0.09] text-white" : "text-white/55"}`}>{label}</button>)}
      </nav>
      {c.restart !== "idle" && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/75 p-[24px]"><div className="w-full rounded-[18px] border border-white/15 bg-[#0e0e10] p-[20px]">{c.restart === "confirm" ? <><p className="text-[18px] font-semibold">Redémarrer ?</p><p className="mt-[6px] text-[13px] text-white/60">Le direct reprend tout seul.</p><div className="mt-[16px] flex gap-[8px]"><button type="button" onClick={a.reboot} className={btnPrimary}>Redémarrer</button><button type="button" onClick={a.cancelRestart} className={btn}>Annuler</button></div></> : <p className="text-[18px] font-semibold">Redémarrage…</p>}</div></div>
      )}
    </div>
  );
}
