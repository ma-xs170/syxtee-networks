"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { renameRelayAction } from "@/app/(dashboard)/dashboard/serveurs/actions";
import { coreFetch } from "@/components/dashboard/coreClient";
import StreamPreview from "@/components/dashboard/StreamPreview";
import { dbToFill, efficiency, fmtKbps, quality, qualityLevel, seriesStats, sortPeers, summarize } from "@/lib/control-center";
import { Area, duration, formatOf, Kpi, LEVEL, Meter, ModemTile, nf, PanelHead, RANGES, Stat, TimeAxis, Track, fmtFull, nearest, type Hover, type PeerRow, type RangeId, type Sample } from "./shared";
import { useControl } from "./useControl";

// Page d'un flux : aperçu en haut à gauche, infos (nom, format) à droite, puis toutes les mesures en direct,
// les modems et la chronologie.

function Rename({ id, name }: { id: string; name: string }) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const n = value.trim();
    if (n === name) return setEdit(false);
    setBusy(true);
    const r = await renameRelayAction(id, n);
    setBusy(false);
    if ("error" in r && r.error) return setErr(r.error);
    setErr(null);
    setEdit(false);
  }

  if (!edit) {
    return (
      <span className="flex min-w-0 items-center justify-end gap-2">
        <span className="truncate text-sm font-medium">{name}</span>
        <button type="button" onClick={() => { setValue(name); setEdit(true); }} aria-label="Renommer le flux" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-foreground/[0.07] hover:text-foreground">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
            <path d="m13.5 6.5 4 4" />
          </svg>
        </button>
      </span>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="flex min-w-0 flex-col items-end gap-1.5">
      <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} maxLength={40} aria-label="Nom du flux" onKeyDown={(e) => e.key === "Escape" && setEdit(false)} className="h-8 w-full min-w-0 rounded-md border border-line bg-background px-2 text-sm focus-visible:border-foreground/40 focus-visible:outline-none" />
      <span className="flex gap-1.5">
        <button type="button" onClick={() => { setEdit(false); setErr(null); }} className="rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:text-foreground">Annuler</button>
        <button type="submit" disabled={busy} className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-on-accent disabled:opacity-60">Enregistrer</button>
      </span>
      {err && <span role="alert" className="text-xs text-bad">{err}</span>}
    </form>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-3 py-2.5 last:border-0">
      <dt className="shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-mono text-[13px] tabular-nums">{children}</dd>
    </div>
  );
}

export default function RelayDetail({ coreUrl, relayId }: { coreUrl: string; relayId: string }) {
  const { relays, error, now } = useControl(coreUrl);
  const [range, setRange] = useState<RangeId>("15m");
  const [hist, setHist] = useState<Sample[]>([]);
  const [conns, setConns] = useState<Record<string, PeerRow[]>>({});
  const [full, setFull] = useState(false);
  const [ht, setHt] = useState<number | null>(null);

  const current = relays?.find((r) => r.id === relayId) ?? null;
  const live = !!current?.live;

  const loadHistory = useCallback(async () => {
    try {
      const [h, p] = await Promise.all([coreFetch(coreUrl, `/v1/me/relays/${relayId}/health?range=${range}`), coreFetch(coreUrl, `/v1/me/relays/${relayId}/peers?range=${range}`)]);
      if (h.ok) setHist(((await h.json()) as { samples: Sample[] }).samples);
      if (p.ok) setConns(((await p.json()) as { conns: Record<string, PeerRow[]> }).conns);
    } catch {
      /* le relevé en direct continue ; l'historique se rechargera au prochain tour */
    }
  }, [coreUrl, relayId, range]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistory();
    const id = setInterval(() => !document.hidden && void loadHistory(), live ? 5000 : 30_000);
    return () => clearInterval(id);
  }, [loadHistory, live]);

  if (!relays) {
    return error ? (
      <p role="alert" className="m-4 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">Le Core ne répond pas. Réessaie dans un instant.</p>
    ) : (
      <div aria-hidden="true" className="m-4 h-96 flex-1 animate-pulse rounded-lg bg-foreground/[0.04] motion-reduce:animate-none" />
    );
  }
  if (!current) {
    return (
      <div className="p-10 text-center text-sm text-muted">
        Flux introuvable. <Link href="/dashboard/cloud" className="underline underline-offset-4 hover:text-foreground">Retour à Cloud</Link>
      </div>
    );
  }

  const win = RANGES.find((r) => r.id === range)!.ms;
  const rangeLabel = RANGES.find((r) => r.id === range)!.label;
  const peers = sortPeers(live ? current.peers : []);
  const sum = summarize(peers);
  const eff = efficiency(peers);
  const sm = current.sample;
  const q = live ? quality(sm, current.lost_1m, peers) : null;
  const ql = LEVEL[qualityLevel(q)];
  const net = peers.reduce((a, p) => a + (p.throughput ?? 0), 0);
  const bitrateSeries = hist.map((s) => ({ t: s.t, v: s.bitrate }));
  const rttSeries = hist.map((s) => ({ t: s.t, v: s.rtt }));
  const lossSeries = hist.map((s) => ({ t: s.t, v: s.dropped }));
  const bs = seriesStats(bitrateSeries);
  const lost = hist.reduce((a, s) => a + s.dropped, 0);
  const connIds = sortPeers(Object.keys(conns).map((connection_id) => ({ connection_id }))).map((c) => c.connection_id);
  const gone = connIds.filter((id) => !peers.some((p) => p.connection_id === id));
  const fill = dbToFill(current.media?.audio_db ?? null);
  const end = bitrateSeries.length ? bitrateSeries[bitrateSeries.length - 1].t : now;
  const hover: Hover = { t: ht, set: setHt };
  // Valeur du relevé survolé ; sans survol, la valeur actuelle.
  const at = (pts: { t: number; v: number }[], f: (v: number) => string, fallback: string) => {
    const p = ht != null && ht >= end - win && ht <= end ? nearest(pts, ht) : null;
    return p ? f(p.v) : fallback;
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
        <Link href="/dashboard/cloud" className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-foreground/30 hover:text-foreground">
          <span aria-hidden="true">←</span> Cloud
        </Link>
        <span className={`h-2 w-2 rounded-full ${live ? "bg-live" : "bg-muted/50"}`} aria-hidden="true" />
        <h1 className="min-w-0 truncate text-base font-semibold">{current.name}</h1>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{live ? `En direct · ${duration(current.since, now)}` : "Hors ligne"}</span>
        <div role="group" aria-label="Période" className="ml-auto inline-flex rounded-md border border-line p-0.5 font-mono text-[11px]">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)} className={`rounded px-3 py-1 transition-colors ${range === r.id ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4 p-4">
        <div className="flex w-full min-w-0 max-w-[44rem] items-start gap-3 lg:w-[44rem]">
          <div className="w-full min-w-0">
            {live ? (
              <StreamPreview coreUrl={coreUrl} relayId={current.id} fullControl={{ full, setFull }} />
            ) : (
              <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-line px-6 text-center text-sm text-muted">Hors ligne : l&apos;aperçu revient dès que le flux arrive.</div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-center gap-3">
            <button type="button" disabled={!live} onClick={() => setFull(true)} className="h-9 whitespace-nowrap rounded-md border border-line px-3 text-sm text-muted transition-colors hover:border-foreground/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-40">
              Plein écran
            </button>
            <div className="flex flex-col items-center gap-1.5" aria-hidden={!live}>
              <Meter fill={fill} className="h-24" />
              <span className="font-mono text-[10px] text-muted">dB</span>
            </div>
          </div>
        </div>

        <aside aria-label="Infos" className="w-full self-start rounded-lg border border-line bg-surface sm:w-[22rem]">
          <PanelHead title="Infos" />
          <dl>
            <Info label="Nom"><Rename id={current.id} name={current.name} /></Info>
            <Info label="Format">{formatOf(current.media)}</Info>
            <Info label="Codec">{current.media?.codec ? current.media.codec.toUpperCase() : "—"}</Info>
            <Info label="Protocole">{current.protocol.toUpperCase()}</Info>
            <Info label="Qualité">
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${ql.dot}`} aria-hidden="true" />
                {q != null ? `${q} %` : "—"}
              </span>
            </Info>
            <Info label="Audio">{live && current.media?.audio_db != null ? `${Math.round(current.media.audio_db)} dB` : "—"}</Info>
          </dl>
        </aside>
      </div>

      <section aria-label="Indicateurs clés" className="grid grid-cols-2 divide-x divide-y divide-line border-y border-line sm:grid-cols-3 sm:divide-y-0 xl:grid-cols-6">
        <Kpi label="Débit utile" value={live && sm ? fmtKbps(sm.bitrate) : "—"} hint="Débit vidéo reçu, sans les retransmissions" />
        <Kpi label="Latence" value={live && sm ? `${Math.round(sm.rtt)} ms` : "—"} hint="Temps aller-retour entre l'encodeur et le serveur" />
        <Kpi label="Pertes · 1 min" value={live && current.lost_1m != null ? nf.format(current.lost_1m) : "—"} tone={live && (current.lost_1m ?? 0) > 0 ? "warn" : undefined} />
        <Kpi label="Rendement" value={live && eff != null ? `${eff} %` : "—"} hint="Part du débit réseau qui est du débit utile" />
        <Kpi label="Modems actifs" value={live ? `${sum.active} / ${peers.length}` : "—"} tone={live && sum.weak > 0 ? "warn" : undefined} />
        <Kpi label="Débit réseau" value={live && net > 0 ? fmtKbps(net) : "—"} />
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:divide-x lg:divide-line">
        <section aria-label="Connexions" className="min-w-0">
          <PanelHead title="Connexions" right={peers.length > 0 ? <span className="font-mono text-[11px] text-muted">{peers.length} modem{peers.length > 1 ? "s" : ""}</span> : undefined} />
          {peers.length === 0 && gone.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">{live ? "Flux en direct sans détail par connexion (flux SRT simple)." : "Aucune connexion : le direct n'est pas démarré."}</p>
          ) : (
            <div className="grid gap-3 p-3 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
              {peers.map((p, i) => <ModemTile key={p.connection_id} index={i + 1} peer={p} history={conns[p.connection_id] ?? []} window={win} total={sum.total} />)}
              {gone.map((id, i) => <ModemTile key={id} index={peers.length + i + 1} peer={{ connection_id: id, bitrate: 0 }} history={conns[id] ?? []} window={win} total={sum.total} />)}
            </div>
          )}
        </section>

        <aside aria-label="Détails" className="border-t border-line lg:border-t-0">
          {live && (
            <>
              <PanelHead title="En direct" />
              <dl>
                <Stat label="Congestion" value={sm ? `${Math.round(sm.congestion * 100)} %` : "—"} hint="Part de la bande passante saturée" />
                <Stat label="Latence SRT" value={sm?.latency != null ? `${Math.round(sm.latency)} ms` : "—"} />
                <Stat label="Tampon" value={sm?.buffer != null ? `${Math.round(sm.buffer)} ms` : "—"} />
                <Stat label="Modems faibles" value={String(sum.weak)} hint="Moins de 1 Mb/s" />
              </dl>
            </>
          )}
          <PanelHead title={`Période · ${rangeLabel}`} />
          <dl>
            <Stat label="Moyen" value={fmtKbps(bs.avg)} hint="Débit utile moyen" />
            <Stat label="Pic" value={fmtKbps(bs.max)} />
            <Stat label="Creux" value={fmtKbps(bs.min)} />
            <Stat label="Sous 300 kb/s" value={`${bs.down} %`} hint="Part du temps où le débit utile est presque nul" />
            <Stat label="Paquets perdus" value={nf.format(lost)} />
          </dl>
        </aside>
      </div>

      <section aria-label="Chronologie" className="border-t border-line">
        <PanelHead title="Chronologie" right={<span className="font-mono text-[11px] tabular-nums text-muted">{ht != null && ht >= end - win && ht <= end ? fmtFull(ht) : `−${rangeLabel} → maintenant`}</span>} />
        <Track label="Débit utile" value={at(bitrateSeries, (v) => fmtKbps(v), sm ? fmtKbps(sm.bitrate) : "—")}>
          <Area points={bitrateSeries} window={win} end={end} hover={hover} fmt={fmtKbps} showMax className="h-28" />
          <TimeAxis window={win} end={end} />
        </Track>
        <Track label="Latence" value={at(rttSeries, (v) => `${Math.round(v)} ms`, sm ? `${Math.round(sm.rtt)} ms` : "—")}>
          <Area points={rttSeries} window={win} end={end} hover={hover} fmt={(v) => `${Math.round(v)} ms`} showMax className="h-16" tone="ink" />
        </Track>
        <Track label="Pertes" value={at(lossSeries, (v) => nf.format(Math.round(v)), nf.format(lost))}>
          <Area points={lossSeries} window={win} end={end} hover={hover} fmt={(v) => nf.format(Math.round(v))} showMax className="h-16" tone="ink" max={Math.max(10, ...lossSeries.map((p) => p.v)) * 1.1} />
        </Track>
      </section>
    </div>
  );
}
