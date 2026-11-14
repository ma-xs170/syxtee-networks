"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { coreFetch } from "@/components/dashboard/coreClient";
import StreamPreview from "@/components/dashboard/StreamPreview";
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

/** Courbe de débit avec repères, comme une régie : échelle en Mb/s à gauche, temps en bas, grille en pointillés. */
function QualityChart({ points, window, label }: { points: Point[]; window: number; label: string }) {
  const top = Math.max(1000, ...points.map((p) => p.v)) * 1.1;
  const steps = [1, 2 / 3, 1 / 3, 0];
  const mb = (v: number) => (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(".", ",");
  return (
    <div>
      <div className="flex">
        <div className="flex h-32 w-8 shrink-0 flex-col justify-between pr-1.5 text-right font-mono text-[10px] tabular-nums text-muted" aria-hidden="true">
          {steps.map((f) => <span key={f}>{mb(top * f)}</span>)}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-line bg-background">
          <Area points={points} window={window} max={top} className="h-32" tone="ink" />
        </div>
      </div>
      <p className="mt-1 flex justify-between pl-8 font-mono text-[10px] text-muted" aria-hidden="true">
        <span>−{label}</span>
        <span>maintenant</span>
      </p>
      <p className="sr-only">Débit en Mb/s sur les {label} écoulées.</p>
    </div>
  );
}

/** Bandeau de panneau : libellé mono en capitales, comme la barre d'un outil de montage. */
function PanelHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-line px-3">
      <h2 className="font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted">{title}</h2>
      {right}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line px-3 py-2 last:border-0">
      <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="text-right font-mono text-[13px] tabular-nums" title={hint}>{value}</dd>
    </div>
  );
}

/** Indicateur clé : grand chiffre, libellé mono. `warn` colore la valeur quand il faut regarder. */
function Kpi({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${tone === "warn" ? "text-warn" : ""}`}>{value}</p>
    </div>
  );
}

/** Piste de la chronologie : étiquette et valeur à gauche, courbe à droite. */
function Track({ label, value, children }: { label: string; value: string; children: ReactNode }) {
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

function ModemTile({ index, peer, history, window, total }: { index: number; peer: Peer; history: PeerRow[]; window: number; total: number }) {
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
        <Area points={pts} window={window} tone="ink" className="h-14" />
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
    <div className="overflow-hidden rounded-xl border border-line bg-surface" role="region" aria-label="Centre de contrôle Cloud">
      {/* Barre d'outils : relais regardé à gauche, période à droite. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-background px-3 py-2">
        <span className={`h-2 w-2 rounded-full ${live ? "bg-live" : "bg-muted/50"}`} aria-hidden="true" />
        <p className="min-w-0 truncate text-sm font-semibold">{current?.name}</p>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{live ? `En direct · ${duration(current?.since ?? null, now)}` : "Hors ligne"}</span>
        <div role="group" aria-label="Période" className="ml-auto inline-flex rounded-md border border-line p-0.5 font-mono text-[11px]">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)} className={`rounded px-3 py-1 transition-colors ${range === r.id ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {current && (
        <>
          <div className="grid lg:grid-cols-[15rem_minmax(0,1fr)_19rem] lg:divide-x lg:divide-line">
            {/* Gauche : relais du compte. */}
            <aside aria-label="Relais" className="border-b border-line lg:border-b-0">
              <PanelHead title="Relais" right={<span className="font-mono text-[11px] text-muted">{relays.filter((r) => r.live).length} / {relays.length}</span>} />
              <ul>
                {relays.map((r) => {
                  const on = r.id === current.id;
                  return (
                    <li key={r.id} className="border-b border-line last:border-0">
                      <button type="button" aria-pressed={on} onClick={() => setPicked(r.id)} className={`w-full px-3 py-2.5 text-left transition-colors ${on ? "bg-foreground/[0.07]" : "hover:bg-foreground/[0.04]"}`}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${r.live ? "bg-live" : "bg-muted/50"}`} aria-hidden="true" />
                          <span className="truncate text-sm font-medium">{r.name}</span>
                          <span className="ml-auto font-mono text-[10px] uppercase text-muted">{r.protocol}</span>
                        </span>
                        <span className="mt-1 block pl-4 font-mono text-[11px] tabular-nums text-muted">
                          {r.live && r.sample ? `${fmtKbps(r.sample.bitrate)} · ${r.peers.length} modem${r.peers.length > 1 ? "s" : ""} · ${Math.round(r.sample.rtt)} ms` : "Hors ligne"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Centre : indicateurs, aperçu, connexions. */}
            <div className="min-w-0">
              <section aria-label="Indicateurs clés" className="grid grid-cols-2 divide-x divide-y divide-line border-b border-line sm:grid-cols-3 sm:divide-y-0 xl:grid-cols-6">
                <Kpi label="Débit utile" value={live && sm ? fmtKbps(sm.bitrate) : "—"} />
                <Kpi label="Latence" value={live && sm ? `${Math.round(sm.rtt)} ms` : "—"} />
                <Kpi label="Pertes · 1 min" value={live && current.lost_1m != null ? nf.format(current.lost_1m) : "—"} tone={live && (current.lost_1m ?? 0) > 0 ? "warn" : undefined} />
                <Kpi label="Rendement" value={live && eff != null ? `${eff} %` : "—"} />
                <Kpi label="Modems actifs" value={live ? `${sum.active} / ${peers.length}` : "—"} tone={live && sum.weak > 0 ? "warn" : undefined} />
                <Kpi label="Débit réseau" value={live && net > 0 ? fmtKbps(net) : "—"} />
              </section>
              <div className="border-b border-line bg-background p-3">
                {live ? (
                  <StreamPreview coreUrl={coreUrl} relayId={current.id} />
                ) : (
                  <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-line px-6 text-center text-sm text-muted">Hors ligne : l&apos;aperçu revient dès que le flux arrive.</div>
                )}
              </div>
              <section aria-label="Connexions">
                <PanelHead title="Connexions" right={peers.length > 0 ? <span className="font-mono text-[11px] text-muted">{peers.length} modem{peers.length > 1 ? "s" : ""}</span> : undefined} />
                {peers.length === 0 && gone.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted">{live ? "Flux en direct sans détail par connexion (flux SRT simple)." : "Aucune connexion : le direct n'est pas démarré."}</p>
                ) : (
                  <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
                    {peers.map((p, i) => (
                      <ModemTile key={p.connection_id} index={i + 1} peer={p} history={conns[p.connection_id] ?? []} window={win} total={sum.total} />
                    ))}
                    {gone.map((id, i) => (
                      <ModemTile key={id} index={peers.length + i + 1} peer={{ connection_id: id, bitrate: 0 }} history={conns[id] ?? []} window={win} total={sum.total} />
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Droite : mesures en direct. */}
            <aside aria-label="Mesures en direct" className="border-t border-line lg:border-t-0">
              <PanelHead title="Mesures en direct" />
              <dl>
                <Stat label="Pertes (1 min)" value={current.lost_1m != null ? nf.format(current.lost_1m) : "—"} />
                <Stat label="Congestion" value={sm ? `${Math.round(sm.congestion * 100)} %` : "—"} />
                <Stat label="Débit utile" value={sm ? fmtKbps(sm.bitrate) : "—"} />
                <Stat label="Débit réseau" value={net > 0 ? fmtKbps(net) : "—"} hint="Retransmissions comprises" />
                <Stat label="Rendement" value={eff != null ? `${eff} %` : "—"} hint="Part du débit réseau qui est du débit utile" />
                <Stat label="RTT" value={sm ? `${Math.round(sm.rtt)} ms` : "—"} />
                <Stat label="Latence SRT" value={sm?.latency != null ? `${Math.round(sm.latency)} ms` : "—"} />
                <Stat label="Tampon" value={sm?.buffer != null ? `${Math.round(sm.buffer)} ms` : "—"} />
                <Stat label="Modems actifs" value={live ? `${sum.active} / ${peers.length}` : "—"} hint="Connexions qui portent plus de 300 kb/s" />
                <Stat label="Modems faibles" value={live ? String(sum.weak) : "—"} hint="Moins de 1 Mb/s" />
              </dl>
              <PanelHead title={`Période · ${RANGES.find((r) => r.id === range)!.label}`} />
              <dl>
                <Stat label="Moyen" value={fmtKbps(bs.avg)} />
                <Stat label="Pic" value={fmtKbps(bs.max)} />
                <Stat label="Creux" value={fmtKbps(bs.min)} />
                <Stat label="Sous 300 kb/s" value={`${bs.down} %`} hint="Part du temps où le débit utile est presque nul" />
              </dl>
            </aside>
          </div>

          {/* Bas : chronologie, une piste par mesure. */}
          <section aria-label="Chronologie" className="border-t border-line">
            <PanelHead title="Chronologie" right={<span className="font-mono text-[11px] text-muted">−{RANGES.find((r) => r.id === range)!.label} → maintenant</span>} />
            <Track label="Débit utile" value={sm ? fmtKbps(sm.bitrate) : "—"}>
              <QualityChart points={bitrateSeries} window={win} label={RANGES.find((r) => r.id === range)!.label} />
            </Track>
            <Track label="Latence · ms" value={sm ? `${Math.round(sm.rtt)} ms` : "—"}>
              <Area points={rttSeries} window={win} className="h-16" tone="ink" />
            </Track>
            <Track label="Pertes" value={nf.format(lost)}>
              <Area points={lossSeries} window={win} className="h-16" tone="ink" max={Math.max(10, ...lossSeries.map((p) => p.v)) * 1.1} />
            </Track>
          </section>
        </>
      )}
    </div>
  );
}
