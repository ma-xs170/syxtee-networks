"use client";

import { useId, useState, type ReactNode } from "react";
import { BAD, WARN, dbToFill, fmtKbps, levelOf, seriesStats, share, type Level, type Peer, type Point } from "@/lib/control-center";

// Éléments communs aux pages Cloud : mêmes types, mêmes courbes, mêmes tuiles.

export type Sample = { t: number; bitrate: number; rtt: number; dropped: number; buffer: number | null; latency: number | null; congestion: number; links: number };
export type Media = { width: number | null; height: number | null; codec: string | null; fps: number | null; audio_db: number | null; audio?: Audio | null };
export type Audio = { l: number; r: number; peak_l: number; peak_r: number };
export type Relay = { id: string; name: string; protocol: string; live: boolean; since: number | null; sample: Sample | null; lost_1m: number | null; media: Media | null; peers: Peer[] };
export type PeerRow = { t: number; bitrate: number; throughput: number | null; jitter: number | null };

export const RANGES = [
  { id: "15m", label: "15 min", ms: 15 * 60_000 },
  { id: "1h", label: "1 h", ms: 3_600_000 },
  { id: "6h", label: "6 h", ms: 6 * 3_600_000 },
  { id: "24h", label: "24 h", ms: 24 * 3_600_000 },
] as const;
export type RangeId = (typeof RANGES)[number]["id"];

export const nf = new Intl.NumberFormat("fr-FR");
export const LEVEL: Record<Level, { dot: string; text: string; label: string }> = {
  off: { dot: "bg-muted/50", text: "text-muted", label: "Coupé" },
  bad: { dot: "bg-bad", text: "text-bad", label: "Très bas" },
  warn: { dot: "bg-warn", text: "text-warn", label: "Faible" },
  ok: { dot: "bg-ok", text: "text-ok", label: "Bon" },
};

export function duration(sinceMs: number | null, now: number) {
  if (!sinceMs) return "—";
  const s = Math.max(0, Math.floor((now - sinceMs) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min ${String(s % 60).padStart(2, "0")} s`;
}

export const formatOf = (m: Media | null) => (m?.width && m.height ? `${m.width}x${m.height}${m.fps ? ` · ${Math.round(m.fps)} i/s` : ""}` : "—");

export type Hover = { t: number | null; set: (t: number | null) => void };

export const fmtClock = (t: number, seconds = false) => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: seconds ? "2-digit" : undefined });
export const fmtFull = (t: number) => new Date(t).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Point de la série le plus proche d'un instant (série triée par temps). */
export function nearest(points: Point[], t: number): Point | null {
  if (points.length === 0) return null;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  const prev = points[Math.max(0, lo - 1)];
  return Math.abs(prev.t - t) <= Math.abs(points[lo].t - t) ? prev : points[lo];
}

/**
 * Aire : valeur dans le temps, survolable : un trait suit le pointeur et indique l'heure et la valeur du relevé le plus proche.
 * `hover` partage le survol entre plusieurs courbes (chronologie) ; sans lui, la courbe affiche sa propre infobulle (`fmt` met la valeur en forme).
 * `tone` "ok" = couleur d'état, "ink" = encre (graphiques sans état).
 */
export function Area({ points, window, end, max, className = "h-24", tone = "ok", hover, fmt, showMax, levels }: { levels?: boolean; points: Point[]; window: number; end?: number; max?: number; className?: string; tone?: "ok" | "ink"; hover?: Hover; fmt?: (v: number) => string; showMax?: boolean }) {
  const [own, setOwn] = useState<number | null>(null);
  const gid = useId();
  const h: Hover = hover ?? { t: own, set: setOwn };
  if (points.length < 2) return <div className={`${className} grid place-items-center rounded-lg border border-dashed border-line text-xs text-muted`}>Pas encore de données</div>;
  const t1 = end ?? points[points.length - 1].t;
  const t0 = t1 - window;
  const top = max ?? Math.max(levels ? WARN * 1.3 : 1000, ...points.map((p) => p.v)) * 1.1;
  const x = (t: number) => Math.max(0, Math.min(100, ((t - t0) / window) * 100));
  const y = (v: number) => 40 - Math.min(1, v / top) * 38;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(2)} ${y(p.v).toFixed(2)}`).join("");
  const area = `${line}L${x(points[points.length - 1].t).toFixed(2)} 40L${x(points[0].t).toFixed(2)} 40Z`;
  const color = tone === "ok" ? "text-ok" : "text-foreground";
  const hit = h.t != null && h.t >= t0 && h.t <= t1 ? nearest(points, h.t) : null;
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    h.set(t0 + Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * window);
  };
  return (
    <div className="relative touch-pan-y" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => h.set(null)}>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={`${className} w-full ${color}`} role="img" aria-label={`Courbe, maximum ${nf.format(Math.round(top))}`}>
        <path d="M0 1H100M0 20H100M0 39H100" stroke="currentColor" className="text-foreground" strokeOpacity={0.1} strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />
        {levels && (
          <defs>
            <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="40">
              <stop offset={`${(y(WARN) / 40) * 100}%`} stopColor="var(--ok)" />
              <stop offset={`${(y(WARN) / 40) * 100}%`} stopColor="var(--warn)" />
              <stop offset={`${(y(BAD) / 40) * 100}%`} stopColor="var(--warn)" />
              <stop offset={`${(y(BAD) / 40) * 100}%`} stopColor="var(--bad)" />
            </linearGradient>
          </defs>
        )}
        <path d={area} fill={levels ? `url(#${gid})` : "currentColor"} fillOpacity={levels ? 0.4 : tone === "ok" ? 0.55 : 0.12} />
        <path d={line} fill="none" stroke={levels ? `url(#${gid})` : "currentColor"} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
      </svg>
      {showMax && fmt && <span aria-hidden="true" className="pointer-events-none absolute left-1.5 top-0.5 font-mono text-[10px] text-muted">{fmt(top)}</span>}
      {hit && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-foreground/50" style={{ left: `${x(hit.t)}%` }} />
          <span aria-hidden="true" className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-foreground" style={{ left: `${x(hit.t)}%`, top: `${(y(hit.v) / 40) * 100}%` }} />
          {!hover && (
            <span className={`pointer-events-none absolute top-1 whitespace-nowrap rounded bg-background/90 px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${x(hit.t) > 55 ? "right-1" : "left-1"}`}>
              {fmtClock(hit.t, true)} · {fmt ? fmt(hit.v) : nf.format(Math.round(hit.v))}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function PanelHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-line px-3">
      <h2 className="font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted">{title}</h2>
      {right}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line px-3 py-2 transition-colors last:border-0 hover:bg-foreground/[0.04]" title={hint}>
      <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="text-right font-mono text-[13px] tabular-nums">{value}</dd>
    </div>
  );
}

/** Tuile de la barre du haut : valeur en grand, libellé dessous, couleur d'état optionnelle, courbe optionnelle. */
export function Tile({ label, value, tone, hint, spark, levels }: { label: string; value: string; tone?: Level | "warn"; hint?: string; spark?: Point[]; levels?: boolean }) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : tone === "off" ? "text-muted" : "";
  return (
    <div className="flex min-w-[7.5rem] flex-1 items-center gap-3 rounded-lg bg-foreground/[0.05] px-3 py-2 transition-colors hover:bg-foreground/[0.09]" title={hint}>
      <div className="min-w-0">
        <p className={`truncate text-xl font-semibold leading-tight tabular-nums tracking-tight ${color}`}>{value}</p>
        <p className="truncate font-mono text-[11px] leading-tight text-muted">{label}</p>
      </div>
      {spark && <Spark points={spark} levels={levels} className={`ml-auto h-8 w-16 shrink-0 ${color}`} />}
    </div>
  );
}

/** Mini courbe qui suit la valeur. `levels` : la couleur suit le débit (rouge sous 300 kb/s, orange sous 1 Mb/s, vert au-dessus), sur la courbe elle-même. */
export function Spark({ points, className = "", levels = false }: { points: Point[]; className?: string; levels?: boolean }) {
  const gid = useId();
  if (points.length < 2) return <div className={`${className} border-b border-dashed border-line`} aria-hidden="true" />;
  const pts = points.slice(-60);
  const max = Math.max(levels ? WARN * 1.3 : 1, ...pts.map((p) => p.v));
  const y = (v: number) => 30 - (v / max) * 28;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * 100).toFixed(1)} ${y(p.v).toFixed(1)}`).join("");
  const paint = levels ? `url(#${gid})` : "currentColor";
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={className} aria-hidden="true">
      {levels && (
        <defs>
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="32">
            <stop offset={`${(y(WARN) / 32) * 100}%`} stopColor="var(--ok)" />
            <stop offset={`${(y(WARN) / 32) * 100}%`} stopColor="var(--warn)" />
            <stop offset={`${(y(BAD) / 32) * 100}%`} stopColor="var(--warn)" />
            <stop offset={`${(y(BAD) / 32) * 100}%`} stopColor="var(--bad)" />
          </linearGradient>
        </defs>
      )}
      <path d={`${d}L100 32L0 32Z`} fill={paint} fillOpacity={0.18} />
      <path d={d} fill="none" stroke={paint} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Graduations de l'axe du temps (heures et minutes) sous une courbe. */
export function TimeAxis({ window, end }: { window: number; end: number }) {
  const ticks = Array.from({ length: 6 }, (_, i) => end - window + (window * i) / 5);
  return (
    <div aria-hidden="true" className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-muted">
      {ticks.map((t, i) => <span key={i}>{i === 5 ? "maintenant" : fmtClock(t)}</span>)}
    </div>
  );
}

export function Track({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] border-b border-line last:border-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <div className="border-r border-line px-3 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
        <p className="mt-1 font-mono text-sm tabular-nums">{value}</p>
      </div>
      <div className="min-w-0 p-2">{children}</div>
    </div>
  );
}

export function ModemTile({ index, peer, history, window, total }: { index: number; peer: Peer; history: PeerRow[]; window: number; total: number }) {
  const lv = LEVEL[levelOf(peer.bitrate)];
  const pts = history.map((h) => ({ t: h.t, v: h.bitrate }));
  const st = seriesStats(pts);
  return (
    <article className="bg-surface p-3" aria-label={`Modem ${index}`}>
      <header className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-muted">{String(index).padStart(2, "0")}</span>
        <span className={`h-1.5 w-1.5 rounded-full ${lv.dot}`} aria-hidden="true" />
        <span className={`font-mono text-[11px] uppercase tracking-[0.08em] ${lv.text}`}>{lv.label}</span>
        <span className="ml-auto font-mono text-sm tabular-nums">{fmtKbps(peer.bitrate)}</span>
      </header>
      <div className="mt-2">
        <Area points={pts} window={window} tone="ink" className="h-14" fmt={fmtKbps} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted">
        <dt>Part</dt>
        <dd className="text-right tabular-nums text-foreground">{share(peer.bitrate, total)} %</dd>
        <dt>Gigue</dt>
        <dd className="text-right tabular-nums text-foreground">{peer.jitter != null ? `${peer.jitter.toFixed(1).replace(".", ",")} ms` : "—"}</dd>
        <dt>Moy. / max</dt>
        <dd className="text-right tabular-nums text-foreground">{fmtKbps(st.avg)} / {fmtKbps(st.max)}</dd>
        <dt>Coupé</dt>
        <dd className={`text-right tabular-nums ${st.down > 10 ? "text-bad" : "text-foreground"}`}>{st.down} %</dd>
      </dl>
    </article>
  );
}

const METER_TICKS = [0, -6, -12, -24, -36, -48];
const METER_GRADIENT = "linear-gradient(to top, var(--ok) 0%, var(--ok) 70%, var(--warn) 70%, var(--warn) 90%, var(--bad) 90%)";

function Bar({ rms, peak, label, onVideo, name }: { rms: number | null; peak: number | null; label?: string; onVideo: boolean; name: string }) {
  const fill = dbToFill(rms);
  return (
    <div className="flex h-full flex-col items-center gap-1">
      <div className={`relative w-2.5 flex-1 overflow-hidden rounded-sm ${onVideo ? "bg-white/20" : "bg-foreground/10"}`} role="meter" aria-label={name} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={rms == null ? undefined : Math.round(rms)}>
        <div className="absolute inset-0 transition-[clip-path] duration-200 motion-reduce:transition-none" style={{ background: METER_GRADIENT, clipPath: `inset(${(1 - fill) * 100}% 0 0 0)` }} />
        {peak != null && peak > -60 && <span aria-hidden="true" className="absolute inset-x-0 h-0.5 bg-foreground transition-[bottom] duration-200 motion-reduce:transition-none" style={{ bottom: `calc(${dbToFill(peak) * 100}% - 1px)` }} />}
      </div>
      {label && <span className="font-mono text-[10px] leading-none text-muted">{label}</span>}
    </div>
  );
}

/**
 * Vumètre stéréo : deux canaux (G/D), niveau moyen en barre, crête en trait, graduation en dB (−60 en bas, 0 en haut).
 * `onVideo` : version compacte posée sur une image (sans graduation ni libellés). Sans mesure : barres vides.
 */
export function StereoMeter({ audio, className = "", onVideo = false }: { audio: Audio | null | undefined; className?: string; onVideo?: boolean }) {
  return (
    <div className={`flex gap-1.5 ${className}`}>
      {!onVideo && (
        <div aria-hidden="true" className="relative mb-[15px] w-7">
          {METER_TICKS.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 font-mono text-[9px] leading-none text-muted" style={{ bottom: `${dbToFill(t) * 100}%` }}>{t}</span>
          ))}
        </div>
      )}
      <Bar rms={audio?.l ?? null} peak={audio?.peak_l ?? null} label={onVideo ? undefined : "G"} onVideo={onVideo} name="Niveau audio gauche" />
      <Bar rms={audio?.r ?? null} peak={audio?.peak_r ?? null} label={onVideo ? undefined : "D"} onVideo={onVideo} name="Niveau audio droit" />
    </div>
  );
}
