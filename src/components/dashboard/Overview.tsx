"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { delta, fmtAgo, fmtDuration, fmtInt, type Overview as OverviewData, type Range } from "@/lib/dashboard-data";
import { pluginState } from "@/lib/plugin";
import { DailyBars } from "./charts";
import { apiFetch } from "./apiFetch";
import { Card, Column, DkButton, DkLink, DkTabButtons, ListRow, PageTitle, StatusBadge } from "./kit";
import RelayAnalysis from "@/components/relais/RelayAnalysis";
import { useLiveStatus } from "./LiveStatus";
import UpcomingLives from "./UpcomingLives";
import type { LiveEvent } from "@/lib/calendar";
import { useLinkDevices, type DevicesDemo } from "./useLinkDevices";
import { sendOnce, watchStream } from "../remote/callDevice";
import { Confirm, type ConfirmAsk } from "../remote/ui";

// Tableau de bord : une colonne, dans l'ordre : état du direct, 4 chiffres, alertes (s'il y en a), graphique, appareils + formule.
// Tout ce qui ne sert pas à décider ou agir vite est ailleurs (Statistiques, Serveurs, Direct).
// Données : /api/dashboard/overview (une requête).

function StatusCard({ data, coreUrl, deviceIds }: { data: OverviewData; coreUrl: string; deviceIds: string[] }) {
  const [ask, setAsk] = useState<ConfirmAsk>(null);
  const [busy, setBusy] = useState(false);
  const [orderError, setOrderError] = useState("");

  const device = deviceIds[0] ?? "";
  /** État réel d'OBS (suivi en direct) : `null` tant qu'inconnu ou poste hors ligne. */
  const [streaming, setStreaming] = useState<boolean | null>(null);
  useEffect(() => {
    if (!device) return;
    return watchStream(coreUrl, device, setStreaming);
  }, [coreUrl, device]);
  const live = device ? streaming : null;

  /** Envoie l'ordre au premier poste OBS en ligne ; le vrai direct est celui d'OBS (une source qui émet vers le serveur n'est pas un direct). */
  async function order(method: "StartStream" | "StopStream") {
    setBusy(true);
    setOrderError("");
    try {
      await sendOnce(coreUrl, device, method);
    } catch (e) {
      setOrderError(device ? (e as Error).message : "Aucun poste OBS en ligne.");
    }
    setBusy(false);
  }
  const confirmOrder = () =>
    live
      ? setAsk({ title: "Êtes-vous sûr(e) ?", yesNo: true, text: "OBS arrête la diffusion vers toutes tes destinations.", ok: "Terminer le stream", run: () => void order("StopStream") })
      : setAsk({ title: "Êtes-vous sûr(e) ?", yesNo: true, text: "OBS commence à diffuser vers tes destinations avec la scène en cours.", ok: "Commencer le stream", run: () => void order("StartStream") });
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <p className="text-[14px] text-muted">{live ? "En direct" : data.lastEndedAt ? `Dernier direct ${fmtAgo(data.lastEndedAt)}` : "Aucun direct pour le moment"}</p>
        <div className="flex flex-wrap gap-3">
          <DkLink href="/dashboard/direct">Ouvrir le direct</DkLink>
          <DkButton tone={live ? "danger" : "primary"} disabled={busy || deviceIds.length === 0} onClick={confirmOrder}>{busy ? (live ? "Arrêt…" : "Démarrage…") : live ? "Terminer le stream" : "Commencer le stream"}</DkButton>
        </div>
      </div>
      {orderError && <p role="alert" className="mt-4 text-[14px]" style={{ color: "var(--dk-red)" }}>{orderError}</p>}
      <Confirm ask={ask} onClose={() => setAsk(null)} />
    </Card>
  );
}

function Change({ current, previous }: { current: number; previous: number }) {
  const d = delta(current, previous);
  if (!d) return <span className="dk-mono text-[13px] text-muted">-</span>;
  return (
    <span className="dk-mono text-[13px]" style={{ color: d.up ? "var(--dk-green)" : "var(--dk-red)" }}>
      {d.up ? "▲" : "▼"} {d.text}
      <span className="sr-only"> par rapport à la période précédente</span>
    </span>
  );
}

function Alerts({ alerts }: { alerts: OverviewData["alerts"] }) {
  return (
    <Card>
      <h2 className="mb-1 text-[16px] text-foreground">À surveiller</h2>
      <ul>
        {alerts.slice(0, 3).map((a) => (
          <li key={a.id}>
            <ListRow
              lead={<span aria-hidden="true" className="block size-2 rounded-full" style={{ background: "var(--dk-amber)" }} />}
              title={a.text}
              trailing={<DkLink href={a.href} className="!h-8">{a.cta}</DkLink>}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Analyse en temps réel : tout en haut, seulement tant qu'un relais reçoit un flux (un bloc par relais en direct). */
function LiveAnalysis({ coreUrl }: { coreUrl: string }) {
  const { state } = useLiveStatus();
  const lives = (state?.relays ?? []).filter((r) => r.live);
  if (!coreUrl || lives.length === 0) return null;
  return (
    <section aria-label="Analyse en temps réel" className="grid gap-4">
      <h2 className="flex items-center gap-2.5 text-[16px] text-foreground">
        <span className="live-dot" aria-hidden="true" />
        Analyse en temps réel
      </h2>
      {lives.map((r) => (
        <div key={r.id} className="grid gap-3">
          {lives.length > 1 && <p className="text-[14px] text-muted">{r.name}</p>}
          <RelayAnalysis coreUrl={coreUrl} relayId={r.id} />
        </div>
      ))}
    </section>
  );
}

export default function Overview({ initial, coreUrl = "", demo, upcoming, canEditCalendar = true }: { initial: OverviewData; coreUrl?: string; demo?: DevicesDemo; upcoming?: LiveEvent[]; canEditCalendar?: boolean }) {
  const [now] = useState(() => Date.now());
  const [range, setRange] = useState<Range>(initial.range);
  const [data, setData] = useState(initial);
  const [error, setError] = useState(false);
  const cache = useRef(new Map<Range, OverviewData>([[initial.range, initial]]));
  const { devices, latest } = useLinkDevices(coreUrl, 15000, demo);

  async function changeRange(r: Range) {
    setRange(r);
    const hit = cache.current.get(r);
    if (hit) return setData(hit);
    setError(false);
    try {
      const res = await apiFetch(`/api/dashboard/overview?range=${r}`);
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as OverviewData;
      cache.current.set(r, next);
      setData(next);
    } catch {
      setError(true);
    }
  }

  const { kpis, previous } = data;
  const stats = [
    { label: "Temps de direct", value: fmtDuration(kpis.seconds), cur: kpis.seconds, prev: previous.seconds },
    { label: "Directs", value: fmtInt(kpis.count), cur: kpis.count, prev: previous.count },
    { label: "Durée moyenne", value: kpis.count ? fmtDuration(kpis.avgSeconds) : "-", cur: kpis.avgSeconds, prev: previous.avgSeconds },
    { label: "Débit moyen", value: kpis.avgKbps ? `${fmtInt(kpis.avgKbps)} kbit/s` : "-", cur: kpis.avgKbps, prev: previous.avgKbps },
  ];
  const days = range === "7d" ? data.daily.slice(-7) : data.daily;
  const online = devices?.filter((d) => d.online) ?? [];
  const version = devices?.find((d) => d.plugin_version)?.plugin_version;
  const outdated = pluginState(version, latest) === "outdated";
  const unlimited = (n: number) => (n >= 1_000_000 ? "∞" : String(n));

  return (
    <Column>
      <PageTitle title="Tableau de bord" sub="L'état de ton direct et l'activité de tes serveurs." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <LiveAnalysis coreUrl={coreUrl} />
        <StatusCard data={data} coreUrl={coreUrl} deviceIds={online.map((d) => d.id)} />

        <dl className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-4 lg:grid-cols-4">
          {stats.map((k) => (
            <div key={k.label} className="dk-card !p-5">
              <dt className="dk-label">{k.label}</dt>
              <dd className="dk-mono mt-2 text-[20px] text-foreground">{k.value}</dd>
              <dd className="mt-1"><Change current={k.cur} previous={k.prev} /></dd>
            </div>
          ))}
        </dl>

        {upcoming && <UpcomingLives lives={upcoming} canEdit={canEditCalendar} now={now} />}

        {data.alerts.length > 0 && <Alerts alerts={data.alerts} />}

        <Card>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] text-foreground">Temps de direct par jour</h2>
            <DkTabButtons label="Période" value={range} onChange={(r) => void changeRange(r)} tabs={[{ id: "7d", label: "7 jours" }, { id: "30d", label: "30 jours" }]} />
          </div>
          {error && <p role="alert" className="mb-3 text-[14px]" style={{ color: "var(--dk-red)" }}>Impossible de charger cette période.</p>}
          {data.hasEverStreamed ? (
            <DailyBars days={days} />
          ) : (
            <p className="py-8 text-center text-[14px] text-muted">Tes chiffres apparaissent après ton premier direct.</p>
          )}
        </Card>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[16px] text-foreground">Appareils</h2>
              <Link href="/dashboard/appareils" className="text-[13px] text-muted hover:text-foreground">Gérer</Link>
            </div>
            <ul className="mt-2">
              {devices === null ? (
                <li className="dk-row text-muted">Chargement…</li>
              ) : devices.length === 0 ? (
                <li className="dk-row text-muted">Aucun appareil relié.</li>
              ) : (
                devices.slice(0, 3).map((d) => (
                  <li key={d.id}>
                    <ListRow title={d.name} sub={d.plugin_version ? `Plugin ${d.plugin_version}` : undefined} trailing={<StatusBadge tone={d.online ? "ok" : "neutral"}>{d.online ? "En ligne" : "Hors ligne"}</StatusBadge>} />
                  </li>
                ))
              )}
            </ul>
            {outdated && latest && <p className="mt-2 text-[13px]" style={{ color: "var(--dk-amber)" }}>Plugin à mettre à jour ({latest.version}).</p>}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[16px] text-foreground">Ma formule</h2>
              <Link href="/dashboard/abonnement" className="text-[13px] text-muted hover:text-foreground">Gérer</Link>
            </div>
            <div className="mt-2">
              <ListRow title="Formule" trailing={<span className="text-foreground">{data.plan.name}</span>} />
              <ListRow title="Serveurs actifs" trailing={<span className="dk-mono text-foreground">{data.relays.active} / {unlimited(data.relays.max)}</span>} />
              <ListRow title="Directs simultanés" trailing={<span className="dk-mono text-foreground">{unlimited(data.plan.streams)}</span>} />
            </div>
          </Card>
        </div>
      </div>
    </Column>
  );
}
