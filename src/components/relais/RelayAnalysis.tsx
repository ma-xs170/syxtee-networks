"use client";

import { useEffect, useMemo, useState } from "react";
import { coreFetch, sleep } from "@/components/dashboard/coreClient";
import { useTimezone } from "@/components/dashboard/Timezone";
import { fmtDateLong, fmtHour } from "@/lib/dashboard-data";

// Analyse en temps réel d'un serveur : débit, latence (RTT), congestion, pertes et liens SRTLA, en direct (Server-Sent Events du Core),
// avec l'historique sur 15 min, 1 h, 6 h ou 24 h. La courbe marque le pic ; les pics les plus hauts sont listés dessous.

export type Sample = { t: number; bitrate: number; rtt: number; dropped: number; congestion: number; links: number };
type Peer = { connection_id: string; bitrate: number };
type Live = { live: boolean; since: number; sample: Sample | null; peers?: Peer[] };
export type AnalysisDemo = { live: Live; history: Sample[] };

const RANGES = [
  { id: "15m", label: "15 min", ms: 15 * 60_000 },
  { id: "1h", label: "1 h", ms: 3_600_000 },
  { id: "6h", label: "6 h", ms: 6 * 3_600_000 },
  { id: "24h", label: "24 h", ms: 24 * 3_600_000 },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const nf = new Intl.NumberFormat("fr-FR");
const mbps = (kbps: number) => (kbps >= 1000 ? `${(kbps / 1000).toFixed(1).replace(".", ",")} Mb/s` : `${nf.format(Math.round(kbps))} kb/s`);

function Tile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-mono text-2xl tabular-nums tracking-tight">
        {value}
        {unit && <span className="ml-1.5 text-sm text-muted">{unit}</span>}
      </p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** Pics : maxima locaux du débit, espacés d'au moins 6 % de la fenêtre, du plus haut au plus bas. */
function findPeaks(samples: Sample[], span: number, n = 3) {
  const sorted = [...samples].sort((a, b) => b.bitrate - a.bitrate);
  const out: Sample[] = [];
  for (const s of sorted) {
    if (s.bitrate <= 0) break;
    if (out.every((p) => Math.abs(p.t - s.t) > span * 0.06)) out.push(s);
    if (out.length === n) break;
  }
  return out;
}

function Chart({ samples, rangeMs, rtt = false }: { samples: Sample[]; rangeMs: number; rtt?: boolean }) {
  const tz = useTimezone();
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000;
  const H = rtt ? 110 : 220;
  const val = (s: Sample) => (rtt ? s.rtt : s.bitrate);
  if (samples.length < 2) return <div className={`grid place-items-center text-sm text-muted ${rtt ? "h-28" : "h-56"}`}>Pas encore de mesure sur cette période.</div>;
  const t1 = samples[samples.length - 1].t;
  const t0 = t1 - rangeMs;
  const max = Math.max(rtt ? 50 : 1000, ...samples.map(val)) * 1.12;
  const x = (s: Sample) => ((s.t - t0) / rangeMs) * W;
  const y = (s: Sample) => H - 4 - (val(s) / max) * (H - 12);
  const line = samples.map((s, i) => `${i ? "L" : "M"}${x(s).toFixed(1)} ${y(s).toFixed(1)}`).join("");
  const area = `${line}L${x(samples[samples.length - 1]).toFixed(1)} ${H}L${x(samples[0]).toFixed(1)} ${H}Z`;
  const avg = samples.reduce((a, s) => a + val(s), 0) / samples.length;
  const peak = samples.reduce((a, s) => (val(s) > val(a) ? s : a), samples[0]);
  const avgY = H - 4 - (avg / max) * (H - 12);
  const h = hover !== null ? samples[hover] : null;
  const grid = [0.25, 0.5, 0.75].map((f) => H - 4 - f * (H - 12) * 1);
  const unit = rtt ? "ms" : "kb/s";
  return (
    <div
      className="relative"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const t = t0 + ((e.clientX - r.left) / r.width) * rangeMs;
        let best = 0;
        for (let i = 1; i < samples.length; i++) if (Math.abs(samples[i].t - t) < Math.abs(samples[best].t - t)) best = i;
        setHover(best);
      }}
      onPointerLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`w-full text-foreground ${rtt ? "h-28" : "h-56"}`} role="img" aria-label={rtt ? "Latence en temps réel" : "Débit en temps réel"}>
        <defs>
          <linearGradient id={rtt ? "fade-rtt" : "fade-br"} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((g) => (
          <path key={g} d={`M0 ${g}H${W}`} stroke="currentColor" strokeOpacity="0.08" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={`M0 ${avgY}H${W}`} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
        <path d={area} fill={`url(#${rtt ? "fade-rtt" : "fade-br"})`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="pointer-events-none absolute left-0 top-0 font-mono text-[10px] text-muted">{rtt ? `${Math.round(max)} ms` : mbps(max)}</span>
      <span className="pointer-events-none absolute right-0 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted" style={{ top: `${(avgY / H) * 100}%`, transform: "translateY(40%)" }}>
        moy. {rtt ? `${Math.round(avg)} ms` : mbps(avg)}
      </span>
      {!rtt && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-live" style={{ left: `${(x(peak) / W) * 100}%`, top: `${(y(peak) / H) * 100}%` }} />
          <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-[170%] whitespace-nowrap rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-live" style={{ left: `${Math.min(92, Math.max(8, (x(peak) / W) * 100))}%`, top: `${(y(peak) / H) * 100}%` }}>
            pic {mbps(peak.bitrate)}
          </span>
        </>
      )}
      {h && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${(x(h) / W) * 100}%` }} />
          <span aria-hidden="true" className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground" style={{ left: `${(x(h) / W) * 100}%`, top: `${(y(h) / H) * 100}%` }} />
          <div role="tooltip" className="pointer-events-none absolute -top-2 z-10 whitespace-nowrap rounded-lg border border-line-strong bg-background px-3 py-2 font-mono text-[11px] leading-relaxed shadow-[0_12px_30px_-8px_rgba(0,0,0,0.9)]" style={{ left: `${(x(h) / W) * 100}%`, transform: `translate(${(x(h) / W) * 100 > 70 ? "calc(-100% - 12px)" : "12px"}, -100%)` }}>
            <p><span className="text-foreground">{fmtHour(h.t, true, tz)}</span> <span className="text-muted">{fmtDateLong(h.t, tz)}</span></p>
            <p className="text-base tabular-nums text-foreground">{nf.format(Math.round(val(h)))} <span className="text-xs text-muted">{unit}</span></p>
            <p className="text-muted">RTT {nf.format(Math.round(h.rtt))} ms · {h.dropped} perdu{h.dropped > 1 ? "s" : ""} · {h.links} lien{h.links > 1 ? "s" : ""}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default function RelayAnalysis({ coreUrl, relayId, demo }: { coreUrl: string; relayId: string; demo?: AnalysisDemo }) {
  const tz = useTimezone();
  const [range, setRange] = useState<RangeId>("15m");
  const rangeMs = RANGES.find((r) => r.id === range)!.ms;
  const [live, setLive] = useState<Live | null>(demo?.live ?? null);
  const [history, setHistory] = useState<Sample[]>(demo?.history ?? []);
  const [link, setLink] = useState<"connecting" | "ok" | "error">(demo ? "ok" : "connecting");

  // Historique de la période choisie.
  useEffect(() => {
    if (demo) return;
    let gone = false;
    (async () => {
      try {
        const res = await coreFetch(coreUrl, `/v1/me/relays/${relayId}/health?range=${range}`);
        if (res.ok && !gone) setHistory(((await res.json()) as { samples: Sample[] }).samples);
      } catch {
        // la connexion en direct réessaie plus bas
      }
    })();
    return () => {
      gone = true;
    };
  }, [coreUrl, relayId, range, demo]);

  // Flux en direct, une seule connexion pour toutes les périodes.
  useEffect(() => {
    if (demo) return;
    let stopped = false;
    const ctrl = new AbortController();
    (async () => {
      let delay = 1000;
      while (!stopped) {
        try {
          const res = await coreFetch(coreUrl, `/v1/me/relays/${relayId}/health/stream`, { signal: ctrl.signal });
          if (!res.ok || !res.body) throw new Error(String(res.status));
          setLink("ok");
          delay = 1000;
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let i;
            while ((i = buf.indexOf("\n\n")) >= 0) {
              const block = buf.slice(0, i);
              buf = buf.slice(i + 2);
              const data = block.split("\n").find((l) => l.startsWith("data: "));
              if (!data) continue;
              const s = JSON.parse(data.slice(6)) as Live;
              setLive(s);
              const sample = s.sample;
              if (s.live && sample) setHistory((prev) => [...prev.filter((p) => p.t < sample.t), sample].slice(-6000));
            }
          }
          throw new Error("fermé");
        } catch {
          if (stopped) return;
          setLink("error");
          await sleep(delay);
          delay = Math.min(delay * 2, 30_000);
        }
      }
    })();
    return () => {
      stopped = true;
      ctrl.abort();
    };
  }, [coreUrl, relayId, demo]);

  const s = live?.live ? live.sample : null;
  const now = s?.t ?? history[history.length - 1]?.t ?? Date.now();
  const win = useMemo(() => history.filter((h) => h.t > now - rangeMs), [history, now, rangeMs]);
  const stats = useMemo(() => {
    if (!win.length) return null;
    const br = win.map((h) => h.bitrate);
    const up = br.filter((b) => b > 0);
    const rt = win.map((h) => h.rtt).filter((r) => r > 0);
    return {
      avg: up.length ? up.reduce((a, b) => a + b, 0) / up.length : 0,
      peak: Math.max(...br),
      min: up.length ? Math.min(...up) : 0,
      rttAvg: rt.length ? rt.reduce((a, b) => a + b, 0) / rt.length : 0,
      rttPeak: rt.length ? Math.max(...rt) : 0,
      lost: win.reduce((a, h) => a + h.dropped, 0),
    };
  }, [win]);
  const peaks = useMemo(() => findPeaks(win, rangeMs), [win, rangeMs]);
  const lostMinute = history.filter((h) => h.t > now - 60_000).reduce((a, h) => a + h.dropped, 0);
  const peers = live?.live ? (live.peers ?? []) : [];
  const peerMax = Math.max(1, ...peers.map((p) => p.bitrate));

  return (
    <section aria-labelledby="analyse" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 id="analyse" className="text-sm font-semibold">Analyse en temps réel</h2>
          <p className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
            {link === "error" ? "Serveur injoignable, reconnexion…" : live?.live ? <><span className="live-dot" /> <span className="text-foreground">En direct</span></> : link === "connecting" ? "Connexion…" : "Hors ligne"}
          </p>
        </div>
        <div role="radiogroup" aria-label="Période" className="inline-flex rounded-full border border-line p-0.5">
          {RANGES.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={range === r.id} onClick={() => setRange(r.id)} className={`h-8 whitespace-nowrap rounded-full px-3.5 font-mono text-xs transition-colors ${range === r.id ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Débit reçu" value={s ? (s.bitrate >= 1000 ? (s.bitrate / 1000).toFixed(1).replace(".", ",") : nf.format(Math.round(s.bitrate))) : "-"} unit={s ? (s.bitrate >= 1000 ? "Mb/s" : "kb/s") : undefined} />
        <Tile label="Latence (RTT)" value={s ? nf.format(Math.round(s.rtt)) : "-"} unit="ms" />
        <Tile label="Congestion" value={s ? nf.format(Math.round(s.congestion * 100)) : "-"} unit="%" />
        <Tile label="Paquets perdus" value={s ? nf.format(lostMinute) : "-"} unit="/ min" />
        <Tile label="Liens actifs" value={s ? String(s.links) : "-"} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Débit</p>
          <p className="flex items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-live" />Pic</span>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-px w-4 border-t border-dashed border-foreground/50" />Moyenne</span>
          </p>
        </div>
        <Chart samples={win} rangeMs={rangeMs} />
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-3 text-sm font-medium">Latence (RTT)</p>
          <Chart samples={win} rangeMs={rangeMs} rtt />
        </div>
        <p className="mt-2 flex justify-between font-mono text-[10px] text-muted">
          <span>−{RANGES.find((r) => r.id === range)!.label}</span>
          <span>maintenant</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-line bg-surface">
          <h3 className="border-b border-line px-5 py-3.5 text-sm font-semibold">Sur la période</h3>
          {stats ? (
            <dl className="divide-y divide-line px-5 text-sm">
              {([["Débit moyen", mbps(stats.avg)], ["Pic de débit", mbps(stats.peak)], ["Débit minimum", mbps(stats.min)], ["Latence moyenne", `${Math.round(stats.rttAvg)} ms`], ["Pic de latence", `${Math.round(stats.rttPeak)} ms`], ["Paquets perdus", nf.format(stats.lost)]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-mono font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted">Aucune mesure sur cette période.</p>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-surface">
          <h3 className="border-b border-line px-5 py-3.5 text-sm font-semibold">Pics de débit</h3>
          {peaks.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">Aucun pic sur cette période.</p>
          ) : (
            <ol className="divide-y divide-line px-5 text-sm">
              {peaks.map((p, i) => (
                <li key={p.t} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="text-muted">
                    <span className="mr-2 font-mono text-xs">{i + 1}</span>
                    {fmtHour(p.t, true, tz)} <span className="text-xs">{fmtDateLong(p.t, tz)}</span>
                  </span>
                  <span className="font-mono font-medium tabular-nums">{mbps(p.bitrate)}</span>
                </li>
              ))}
            </ol>
          )}
          {peers.length > 0 && (
            <div className="border-t border-line px-5 py-4">
              <p className="text-xs text-muted">Liens SRTLA · {peers.length}</p>
              <ul className="mt-3 space-y-2.5">
                {peers.map((p, i) => (
                  <li key={p.connection_id} className="flex items-center gap-3 font-mono text-xs">
                    <span className="w-12 text-muted">Lien {i + 1}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/15">
                      <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${(p.bitrate / peerMax) * 100}%` }} />
                    </span>
                    <span className="w-24 text-right tabular-nums">{mbps(p.bitrate)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
