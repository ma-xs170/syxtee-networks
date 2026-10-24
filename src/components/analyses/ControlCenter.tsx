"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { coreFetch } from "@/components/dashboard/coreClient";
import { fmtKbps, levelOf, seriesStats, share, sortPeers, summarize, efficiency, type Level, type Peer, type Point } from "@/lib/control-center";

// Centre de contrôle : tous les relais du compte et, pour celui qu'on regarde, une case par connexion (modem) avec son historique,
// comme une régie de transmission. Le Core est interrogé toutes les 2 s (pause quand l'onglet est caché).

type Sample = { t: number; bitrate: number; rtt: number; dropped: number; buffer: number | null; latency: number | null; congestion: number; links: number };
type Relay = { id: string; name: string; protocol: string; live: boolean; since: number | null; sample: Sample | null; lost_1m: number | null; peers: Peer[] };
type PeerRow = { t: number; bitrate: number; throughput: number | null; jitter: number | null };

const RANGES = [
  { id: "15m", label: "15 min", ms: 15 * 60_000 },
  { id: "1h", label: "1 h", ms: 3_600_000 },
  { id: "6h", label: "6 h", ms: 6 * 3_600_000 },
  { id: "24h", label: "24 h", ms: 24 * 3_600_000 },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const nf = new Intl.NumberFormat("fr-FR");
const LEVEL: Record<Level, { dot: string; text: string; label: string }> = {
  off: { dot: "bg-muted/50", text: "text-muted", label: "Coupé" },
  bad: { dot: "bg-bad", text: "text-bad", label: "Très bas" },
  warn: { dot: "bg-warn", text: "text-warn", label: "Faible" },
  ok: { dot: "bg-ok", text: "text-ok", label: "Bon" },
};

function duration(sinceMs: number | null, now: number) {
  if (!sinceMs) return "—";
  const s = Math.max(0, Math.floor((now - sinceMs) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min ${String(s % 60).padStart(2, "0")} s`;
}

/** Aire : valeur dans le temps. `fill` = couleur du jeton (ok, warn…), le trait reste dans la couleur d'encre pour les graphiques sans état. */
function Area({ points, window, max, className = "h-24", tone = "ok" }: { points: Point[]; window: number; max?: number; className?: string; tone?: "ok" | "ink" }) {
  if (points.length < 2) return <div className={`${className} grid place-items-center rounded-lg border border-dashed border-line text-xs text-muted`}>Pas encore de données</div>;
  const t1 = points[points.length - 1].t;
  const t0 = t1 - window;
  const top = max ?? Math.max(1000, ...points.map((p) => p.v)) * 1.1;
  const x = (t: number) => Math.max(0, ((t - t0) / window) * 100);
  const y = (v: number) => 40 - Math.min(1, v / top) * 38;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(2)} ${y(p.v).toFixed(2)}`).join("");
  const area = `${line}L${x(points[points.length - 1].t).toFixed(2)} 40L${x(points[0].t).toFixed(2)} 40Z`;
  const color = tone === "ok" ? "text-ok" : "text-foreground";
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={`${className} w-full ${color}`} role="img" aria-label={`Courbe, maximum ${nf.format(Math.round(top))}`}>
      <path d="M0 1H100M0 20H100M0 39H100" stroke="currentColor" className="text-foreground" strokeOpacity={0.1} strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />
      <path d={area} fill="currentColor" fillOpacity={tone === "ok" ? 0.55 : 0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
      <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="text-right font-mono text-sm tabular-nums" title={hint}>{value}</dd>
    </div>
  );
}

function ModemTile({ index, peer, history, window, total }: { index: number; peer: Peer; history: PeerRow[]; window: number; total: number }) {
  const lv = LEVEL[levelOf(peer.bitrate)];
  const pts = history.map((h) => ({ t: h.t, v: h.bitrate }));
  const st = seriesStats(pts);
  return (
    <article className="rounded-xl border border-line bg-surface p-3" aria-label={`Modem ${index}`}>
      <header className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted">{index}.</span>
        <span className={`h-2 w-2 rounded-full ${lv.dot}`} aria-hidden="true" />
        <span className={`text-xs font-medium ${lv.text}`}>{lv.label}</span>
        <span className="ml-auto font-mono text-sm tabular-nums">{fmtKbps(peer.bitrate)}</span>
      </header>
      <div className="mt-2">
        <Area points={pts} window={window} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 font-mono text-[11px] text-muted">
        <dt>Part du débit</dt>
        <dd className="text-right tabular-nums text-foreground">{share(peer.bitrate, total)} %</dd>
        <dt>Débit réseau</dt>
        <dd className="text-right tabular-nums text-foreground">{peer.throughput ? fmtKbps(peer.throughput) : "—"}</dd>
        <dt>Gigue</dt>
        <dd className="text-right tabular-nums text-foreground">{peer.jitter != null ? `${peer.jitter.toFixed(1).replace(".", ",")} ms` : "—"}</dd>
        <dt>Moy. / max</dt>
        <dd className="text-right tabular-nums text-foreground">{fmtKbps(st.avg)} / {fmtKbps(st.max)}</dd>
        <dt>Temps coupé</dt>
        <dd className={`text-right tabular-nums ${st.down > 10 ? "text-bad" : "text-foreground"}`}>{st.down} %</dd>
      </dl>
    </article>
  );
}

export default function ControlCenter({ coreUrl }: { coreUrl: string }) {
  const [relays, setRelays] = useState<Relay[] | null>(null);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [range, setRange] = useState<RangeId>("15m");
  const [hist, setHist] = useState<Sample[]>([]);
  const [conns, setConns] = useState<Record<string, PeerRow[]>>({});
  const [now, setNow] = useState(0);

  // Relevé en direct de tous les relais.
  useEffect(() => {
    let stop = false;
    const ctrl = new AbortController();
    async function tick() {
      if (document.hidden) return;
      try {
        const res = await coreFetch(coreUrl, "/v1/me/control", { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as { relays: Relay[] };
        if (!stop) {
          setRelays(j.relays);
          setError(false);
          setNow(Date.now());
        }
      } catch {
        if (!stop && !ctrl.signal.aborted) setError(true);
      }
    }
    void tick();
    const id = setInterval(tick, 2000);
    return () => {
      stop = true;
      ctrl.abort();
      clearInterval(id);
    };
  }, [coreUrl]);

  // Par défaut : le premier relais en direct, sinon le premier.
  const current = useMemo(() => {
    if (!relays?.length) return null;
    return relays.find((r) => r.id === picked) ?? relays.find((r) => r.live) ?? relays[0];
  }, [relays, picked]);
  const currentId = current?.id;
  const live = !!current?.live;

  // Historique du relais regardé : global et par connexion.
  const loadHistory = useCallback(async () => {
    if (!currentId) return;
    try {
      const [h, p] = await Promise.all([coreFetch(coreUrl, `/v1/me/relays/${currentId}/health?range=${range}`), coreFetch(coreUrl, `/v1/me/relays/${currentId}/peers?range=${range}`)]);
      if (h.ok) setHist(((await h.json()) as { samples: Sample[] }).samples);
      if (p.ok) setConns(((await p.json()) as { conns: Record<string, PeerRow[]> }).conns);
    } catch {
      /* le relevé en direct continue ; l'historique se rechargera au prochain tour */
    }
  }, [coreUrl, currentId, range]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistory();
    const id = setInterval(() => !document.hidden && void loadHistory(), live ? 5000 : 30_000);
    return () => clearInterval(id);
  }, [loadHistory, live]);

  if (!relays) {
    return error ? (
      <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">Le Core ne répond pas. Réessaie dans un instant.</p>
    ) : (
      <div aria-hidden="true" className="h-96 animate-pulse rounded-2xl border border-line bg-foreground/[0.04] motion-reduce:animate-none" />
    );
  }
  if (relays.length === 0) return <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">Aucune connexion pour l&apos;instant. Crée-en une dans l&apos;onglet Connexions.</p>;

  const win = RANGES.find((r) => r.id === range)!.ms;
  const peers = sortPeers(live ? (current?.peers ?? []) : []);
  const sum = summarize(peers);
  const eff = efficiency(peers);
  const sm = current?.sample ?? null;
  const net = peers.reduce((a, p) => a + (p.throughput ?? 0), 0);
  const bitrateSeries = hist.map((s) => ({ t: s.t, v: s.bitrate }));
  const rttSeries = hist.map((s) => ({ t: s.t, v: s.rtt }));
  const lossSeries = hist.map((s) => ({ t: s.t, v: s.dropped }));
  const bs = seriesStats(bitrateSeries);
  const lost = hist.reduce((a, s) => a + s.dropped, 0);
  const connIds = sortPeers(Object.keys(conns).map((connection_id) => ({ connection_id }))).map((c) => c.connection_id);
  // Cases : connexions en cours, puis celles qui ont existé sur la période mais ne sont plus là (coupées).
  const gone = connIds.filter((id) => !peers.some((p) => p.connection_id === id));

  return (
    <div className="space-y-6">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Relais">
        {relays.map((r) => {
          const on = r.id === current?.id;
          return (
            <li key={r.id}>
              <button type="button" aria-pressed={on} onClick={() => setPicked(r.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${on ? "border-foreground/50 bg-surface" : "border-line hover:border-foreground/25"}`}>
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${r.live ? "bg-live" : "bg-muted/50"}`} aria-hidden="true" />
                  <span className="truncate text-sm font-medium">{r.name}</span>
                  <span className="ml-auto font-mono text-[11px] uppercase text-muted">{r.live ? "En direct" : "Hors ligne"}</span>
                </span>
                <span className="mt-1.5 block font-mono text-xs tabular-nums text-muted">
                  {r.live && r.sample ? `${fmtKbps(r.sample.bitrate)} · ${r.peers.length} modem${r.peers.length > 1 ? "s" : ""} · ${Math.round(r.sample.rtt)} ms` : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {current && (
        <>
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" aria-label={`Analyse de ${current.name}`}>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-semibold">Débit utile · {current.name}</h2>
                <div role="group" aria-label="Période" className="ml-auto inline-flex rounded-full border border-line p-0.5 text-[13px]">
                  {RANGES.map((r) => (
                    <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)} className={`rounded-full px-3 py-1 transition-colors ${range === r.id ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3">
                <Area points={bitrateSeries} window={win} className="h-48" />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 sm:grid-cols-4">
                <Stat label="Moyen" value={fmtKbps(bs.avg)} />
                <Stat label="Pic" value={fmtKbps(bs.max)} />
                <Stat label="Creux" value={fmtKbps(bs.min)} />
                <Stat label="Sous 300 kb/s" value={`${bs.down} %`} hint="Part du temps où le débit utile est presque nul" />
              </dl>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Latence réseau (RTT, ms)</p>
                  <Area points={rttSeries} window={win} className="h-20" tone="ink" />
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Paquets perdus · {nf.format(lost)} sur la période</p>
                  <Area points={lossSeries} window={win} className="h-20" tone="ink" max={Math.max(10, ...lossSeries.map((p) => p.v)) * 1.1} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4">
              <h2 className="text-sm font-semibold">Mesures en direct</h2>
              <dl className="mt-2">
                <Stat label="Statut" value={live ? "En direct" : "Hors ligne"} />
                <Stat label="Durée du direct" value={duration(current.since, now)} />
                <Stat label="Débit utile" value={sm ? fmtKbps(sm.bitrate) : "—"} />
                <Stat label="Débit réseau" value={net > 0 ? fmtKbps(net) : "—"} hint="Retransmissions comprises" />
                <Stat label="Rendement" value={eff != null ? `${eff} %` : "—"} hint="Part du débit réseau qui est du débit utile" />
                <Stat label="RTT" value={sm ? `${Math.round(sm.rtt)} ms` : "—"} />
                <Stat label="Latence SRT" value={sm?.latency != null ? `${Math.round(sm.latency)} ms` : "—"} />
                <Stat label="Tampon" value={sm?.buffer != null ? `${Math.round(sm.buffer)} ms` : "—"} />
                <Stat label="Pertes (1 min)" value={current.lost_1m != null ? nf.format(current.lost_1m) : "—"} />
                <Stat label="Congestion" value={sm ? `${Math.round(sm.congestion * 100)} %` : "—"} />
                <Stat label="Modems actifs" value={live ? `${sum.active} / ${peers.length}` : "—"} hint="Connexions qui portent plus de 300 kb/s" />
                <Stat label="Modems faibles" value={live ? String(sum.weak) : "—"} hint="Moins de 1 Mb/s" />
              </dl>
            </div>
          </section>

          <section aria-label="Connexions">
            <h2 className="mb-3 text-sm font-semibold">Connexions (modems) {peers.length > 0 && <span className="font-normal text-muted">· {peers.length}</span>}</h2>
            {peers.length === 0 && gone.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">{live ? "Flux en direct sans détail par connexion (flux SRT simple)." : "Aucune connexion : le direct n'est pas démarré."}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {peers.map((p, i) => (
                  <ModemTile key={p.connection_id} index={i + 1} peer={p} history={conns[p.connection_id] ?? []} window={win} total={sum.total} />
                ))}
                {gone.map((id, i) => (
                  <ModemTile key={id} index={peers.length + i + 1} peer={{ connection_id: id, bitrate: 0 }} history={conns[id] ?? []} window={win} total={sum.total} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
