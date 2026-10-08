"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import StatusDot from "../ui/StatusDot";
import AnimatedNumber from "./AnimatedNumber";
import { CONNS, useLiveStats, type LiveSnapshot, type Status } from "./useLiveStats";

// Démo live de la landing : un faux direct IRL qui tourne en boucle, sans backend. Les connexions se coupent d'un clic.

const COLOR: Record<Status, string> = { stable: "var(--ok)", unstable: "var(--warn)", offline: "var(--bad)" };
const LABEL: Record<Status, string> = { stable: "Stable", unstable: "Instable", offline: "Coupure" };
const clock = (s: number) => {
  const n = Math.floor(s);
  return [Math.floor(n / 3600), Math.floor((n % 3600) / 60), n % 60].map((x) => String(x).padStart(2, "0")).join(":");
};

const Spark = memo(function Spark({ data, color }: { data: number[]; color: string }) {
  const max = 12;
  const w = 480;
  const h = 96;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - Math.min(1, v / max) * (h - 6) - 3}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-24 w-full" role="img" aria-label="Débit total sur les dernières secondes">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill="url(#spark-fill)" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ transition: "stroke 0.4s" }} />
    </svg>
  );
});

const Stat = memo(function Stat({ label, value, unit, decimals }: { label: string; value: number; unit: string; decimals: number }) {
  return (
    <div className="rounded-xl border border-line bg-background/60 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-mono text-2xl">
        <AnimatedNumber value={value} decimals={decimals} />
        <span className="ml-1 text-sm text-muted">{unit}</span>
      </p>
    </div>
  );
});

const Connections = memo(function Connections({ snap, onToggle }: { snap: LiveSnapshot; onToggle: (id: (typeof CONNS)[number]["id"]) => void }) {
  return (
    <ul className="grid gap-2">
      {CONNS.map((c) => {
        const on = snap.on[c.id];
        const rate = snap.rates[c.id];
        return (
          <li key={c.id}>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={`${c.label} : ${on ? "couper" : "rallumer"}`}
              onClick={() => onToggle(c.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-150 ${on ? "border-line bg-background/60 hover:border-line-strong" : "border-line border-dashed bg-transparent text-muted"}`}
            >
              <span className="w-12 text-sm font-medium">{c.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
                <span className="block h-full origin-left rounded-full bg-foreground/70 transition-transform duration-500" style={{ transform: `scaleX(${Math.min(1, rate / 4.2)})` }} />
              </span>
              <span className="w-20 text-right font-mono text-sm">
                <AnimatedNumber value={rate} decimals={1} /> <span className="text-muted">Mb/s</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
});

export default function LiveDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const { snap, toggle, cut, paused } = useLiveStats(visible);
  const color = COLOR[snap.status];

  return (
    <div ref={ref} className="card !p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-foreground/[0.08] px-3 py-1 text-xs font-semibold tracking-wide">
            <span className="live-dot" aria-hidden="true" />
            EN LIVE
          </span>
          <span className="font-mono text-sm tabular-nums text-muted">{clock(snap.seconds)}</span>
        </div>
        <div className="flex items-center gap-4">
          <StatusDot status={snap.status === "stable" ? "live" : snap.status === "unstable" ? "unstable" : "offline"} label={LABEL[snap.status]} />
          <Button variant="secondary" className="!h-9" onClick={cut}>
            Simuler une coupure
          </Button>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="grid content-start gap-4">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-background">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--foreground)_10%,transparent),transparent_60%)]" />
            <svg viewBox="0 0 320 180" className="absolute inset-0 h-full w-full" fill="none" stroke="var(--foreground)" strokeOpacity="0.22" aria-hidden="true">
              <path d="M0 140 L70 100 L120 125 L190 70 L250 110 L320 80 V180 H0Z" fill="var(--foreground)" fillOpacity="0.04" />
              <circle cx="240" cy="48" r="14" />
            </svg>
            <span className="absolute left-3 top-3 rounded-md bg-background/80 px-2 py-1 font-mono text-[11px] text-muted">1080p · <AnimatedNumber value={snap.fps} decimals={0} /> FPS</span>
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/85 backdrop-blur-sm transition-[opacity,filter] duration-300 ${snap.slate ? "opacity-100" : "pointer-events-none opacity-0 blur-sm"}`} aria-hidden={!snap.slate}>
              <p className="text-lg font-semibold">Reconnexion en cours</p>
              <p className="text-sm text-muted">Le direct reprend dans un instant.</p>
            </div>
          </div>
          <Spark data={snap.history} color={color} />
          <p role="status" aria-live="off" className="min-h-5 text-sm text-muted">
            {snap.note}
            {paused && " (animation en pause : réglage « réduire les animations »)"}
          </p>
        </div>

        <div className="grid content-start gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Débit total" value={snap.total} unit="Mb/s" decimals={1} />
            <Stat label="Latence" value={snap.latency} unit="ms" decimals={0} />
            <Stat label="Perte de paquets" value={snap.loss} unit="%" decimals={1} />
            <Stat label="Connexions" value={Object.values(snap.on).filter(Boolean).length} unit="/ 4" decimals={0} />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted">Clique une connexion pour la couper ou la rallumer.</p>
            <Connections snap={snap} onToggle={toggle} />
          </div>
        </div>
      </div>
    </div>
  );
}
