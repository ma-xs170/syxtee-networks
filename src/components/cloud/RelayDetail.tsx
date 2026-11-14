"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { renameRelayAction } from "@/app/(dashboard)/dashboard/serveurs/actions";
import { coreFetch } from "@/components/dashboard/coreClient";
import StreamPreview from "@/components/dashboard/StreamPreview";
import { efficiency, fmtKbps, fmtKbpsFull, levelOf, quality, qualityLevel, sortPeers, summarize } from "@/lib/control-center";
import { Area, formatOf, LEVEL, ModemTile, nf, PanelHead, RANGES, StereoMeter, Tile, TimeAxis, Track, fmtFull, nearest, type Hover, type PeerRow, type RangeId, type Sample } from "./shared";
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

const INFO_ICONS = {
  nom: <path d="M4 7h16M4 12h16M4 17h10" />,
  format: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9.5 5 2.5-5 2.5v-5Z" /></>,
  codec: <path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-10-2 12" />,
  protocole: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></>,
  qualite: <path d="M4 18V9m5.3 9V5m5.4 13v-7M20 18V8" />,
  audio: <path d="M4 10v4h3.5L12 18V6L7.5 10H4Zm11.5-.5a4 4 0 0 1 0 5m2.5-7.5a7.5 7.5 0 0 1 0 10" />,
} as const;

function Info({ label, icon, children }: { label: string; icon: keyof typeof INFO_ICONS; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-between gap-4 border-b border-line px-4 py-2.5 last:border-0">
      <dt className="flex shrink-0 items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">{INFO_ICONS[icon]}</svg>
        {label}
      </dt>
      <dd className="min-w-0 text-right font-mono text-[13px] tabular-nums">{children}</dd>
    </div>
  );
}

function Session({ since }: { since: number | null }) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);
  const sec = since ? Math.max(0, Math.floor((t - since) / 1000)) : 0;
  const p = (n: number) => String(n).padStart(2, "0");
  return <Tile label="Session" value={since ? `${p(Math.floor(sec / 3600))}:${p(Math.floor((sec % 3600) / 60))}:${p(sec % 60)}` : "00:00:00"} tone={since ? undefined : "off"} hint={since ? `Début du flux : ${fmtFull(since)}` : "Aucun direct en cours"} />;
}

export default function RelayDetail({ coreUrl, relayId, view = "live", children }: { coreUrl: string; relayId: string; view?: "live" | "stats"; children?: React.ReactNode }) {
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
  const peers = sortPeers(live ? current.peers : []);
  const sum = summarize(peers);
  const eff = efficiency(peers);
  const sm = current.sample;
  const q = live ? quality(sm, current.lost_1m, peers) : null;
  const ql = LEVEL[qualityLevel(q)];
  const bitrateSeries = hist.map((s) => ({ t: s.t, v: s.bitrate }));
  const rttSeries = hist.map((s) => ({ t: s.t, v: s.rtt }));
  const lossSeries = hist.map((s) => ({ t: s.t, v: s.dropped }));
  const lost = hist.reduce((a, s) => a + s.dropped, 0);
  const connIds = sortPeers(Object.keys(conns).map((connection_id) => ({ connection_id }))).map((c) => c.connection_id);
  const gone = connIds.filter((id) => !peers.some((p) => p.connection_id === id));
  const end = bitrateSeries.length ? bitrateSeries[bitrateSeries.length - 1].t : now;
  const hover: Hover = { t: ht, set: setHt };
  // Valeur du relevé survolé ; sans survol, la valeur actuelle.
  const at = (pts: { t: number; v: number }[], f: (v: number) => string, fallback: string) => {
    const p = ht != null && ht >= end - win && ht <= end ? nearest(pts, ht) : null;
    return p ? f(p.v) : fallback;
  };

  return (
    <div className="min-w-0 flex-1">
      <section aria-label="Indicateurs clés" className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
        <Session since={live ? current.since : null} />
        <Tile label="Débit" value={live && sm ? fmtKbpsFull(sm.bitrate) : "—"} tone={live && sm ? levelOf(sm.bitrate) : "off"} spark={live ? bitrateSeries : undefined} levels hint="Débit vidéo reçu, sans les retransmissions" />
        <Tile label="Qualité" value={q != null ? `${q} %` : "—"} tone={live ? qualityLevel(q) : "off"} hint="Note globale : congestion, pertes et modems faibles" />
        <Tile label="Latence" value={live && sm ? `${Math.round(sm.rtt)} ms` : "—"} spark={live ? rttSeries : undefined} hint="Temps aller-retour entre l'encodeur et le serveur" />
        <Tile label="Pertes · 1 min" value={live && current.lost_1m != null ? nf.format(current.lost_1m) : "—"} tone={live && (current.lost_1m ?? 0) > 0 ? "warn" : undefined} />
        <Tile label="Rendement" value={live && eff != null ? `${eff} %` : "—"} hint="Part du débit réseau qui est du débit utile" />
        <Tile label="Modems actifs" value={live ? `${sum.active} / ${peers.length}` : "—"} tone={live && sum.weak > 0 ? "warn" : undefined} />
      </section>

      {view === "live" && (
      <div className="flex flex-wrap items-stretch">
        <section aria-label="Aperçu" className="order-last flex w-full min-w-0 flex-col border-line lg:w-[40rem] lg:border-l">
          <PanelHead title="Aperçu" />
          {live ? (
            <StreamPreview coreUrl={coreUrl} relayId={current.id} fullControl={{ full, setFull }} flush />
          ) : (
            <div className="grid aspect-video place-items-center px-6 text-center text-sm text-muted">Hors ligne : l&apos;aperçu revient dès que le flux arrive.</div>
          )}
        </section>

        <section aria-label="VU-mètre" className="order-2 flex shrink-0 flex-col border-l border-line sm:w-[9rem]">
          <PanelHead title="VU-mètre" />
          <div className="flex flex-1 items-center justify-center px-6 py-3">
            <StereoMeter audio={live ? current.media?.audio : null} className="h-[20rem] justify-center" />
          </div>
        </section>

        <section aria-label="Modems" className="order-1 flex min-w-0 flex-1 basis-[14rem] flex-col border-l border-line">
          <PanelHead title="Modems" right={peers.length > 0 ? <span className="font-mono text-[11px] text-muted">{peers.length} connecté{peers.length > 1 ? "s" : ""}</span> : undefined} />
          {peers.length === 0 && gone.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">{live ? "Flux en direct sans détail par connexion (flux SRT simple)." : "Aucune connexion : le direct n'est pas démarré."}</p>
          ) : (
            <div className="grid gap-3 p-3 [grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]">
              {peers.map((p, i) => <ModemTile key={p.connection_id} index={i + 1} peer={p} history={conns[p.connection_id] ?? []} window={win} total={sum.total} />)}
              {gone.map((id, i) => <ModemTile key={id} index={peers.length + i + 1} peer={{ connection_id: id, bitrate: 0 }} history={conns[id] ?? []} window={win} total={sum.total} />)}
            </div>
          )}
        </section>

        <aside aria-label="Infos" className="order-first flex w-full flex-col sm:w-[18rem]">
          <PanelHead title="Infos" />
          <dl className="flex flex-1 flex-col">
            <Info label="Nom" icon="nom"><Rename id={current.id} name={current.name} /></Info>
            <Info label="Format" icon="format">{formatOf(current.media)}</Info>
            <Info label="Codec" icon="codec">{current.media?.codec ? current.media.codec.toUpperCase() : "—"}</Info>
            <Info label="Protocole" icon="protocole">{current.protocol.toUpperCase()}</Info>
            <Info label="Qualité" icon="qualite">
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${ql.dot}`} aria-hidden="true" />
                {q != null ? `${q} %` : "—"}
              </span>
            </Info>
            <Info label="Audio" icon="audio">{live && current.media?.audio_db != null ? `${Math.round(current.media.audio_db)} dB` : "—"}</Info>
          </dl>
        </aside>
      </div>
      )}

      <section aria-label="Chronologie" className="space-y-3 border-t border-line p-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted">Chronologie</h2>
            <div className="flex items-center gap-3">
              <span className="hidden font-mono text-[11px] tabular-nums text-muted sm:inline">{ht != null && ht >= end - win && ht <= end ? fmtFull(ht) : ""}</span>
              {view === "stats" && <div role="group" aria-label="Période" className="inline-flex rounded-md border border-line p-0.5 font-mono text-[11px]">
                {RANGES.map((r) => (
                  <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)} className={`rounded px-2.5 py-0.5 transition-colors ${range === r.id ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>
                    {r.label}
                  </button>
                ))}
              </div>}
            </div>
        </div>
        <Track label="Débit utile" value={at(bitrateSeries, (v) => fmtKbps(v), sm ? fmtKbps(sm.bitrate) : "—")}>
          <Area points={bitrateSeries} window={win} end={end} hover={hover} fmt={fmtKbps} levels showMax className="h-24" />
        </Track>
        <Track label="Latence" value={at(rttSeries, (v) => `${Math.round(v)} ms`, sm ? `${Math.round(sm.rtt)} ms` : "—")}>
          <Area points={rttSeries} window={win} end={end} hover={hover} fmt={(v) => `${Math.round(v)} ms`} showMax className="h-24" tone="ink" />
        </Track>
        <Track label="Pertes" value={at(lossSeries, (v) => nf.format(Math.round(v)), nf.format(lost))}>
          <Area points={lossSeries} window={win} end={end} hover={hover} fmt={(v) => nf.format(Math.round(v))} showMax className="h-24" tone="ink" max={Math.max(10, ...lossSeries.map((p) => p.v)) * 1.1} />
        </Track>
        <div className="px-4"><TimeAxis window={win} end={end} /></div>
      </section>
      {children}
    </div>
  );
}
