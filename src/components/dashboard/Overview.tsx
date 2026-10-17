"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { delta, fmtAgo, fmtDuration, fmtInt, type Overview as OverviewData, type Range } from "@/lib/dashboard-data";
import { pluginState } from "@/lib/plugin";
import { DailyBars } from "./charts";
import { useLiveClock, useLiveStatus } from "./LiveStatus";
import { apiFetch } from "./apiFetch";
import { Card, Column, DkLink, DkTabButtons, ListRow, PageTitle, StatusBadge } from "./kit";
import { useLinkDevices, type DevicesDemo } from "./useLinkDevices";
import { PlatformLogo } from "../remote/MultistreamPanel";

// Tableau de bord : une colonne, dans l'ordre : état du direct, 4 chiffres, alertes (s'il y en a), graphique, appareils + formule.
// Tout ce qui ne sert pas à décider ou agir vite est ailleurs (Statistiques, Serveurs, Direct).
// Données : /api/dashboard/overview (une requête).

function StatusCard({ data, platforms }: { data: OverviewData; platforms: string[] }) {
  const { state, link } = useLiveStatus();
  const clock = useLiveClock();
  const reconnecting = !!state?.reconnecting;
  const on = !!state?.live || reconnecting;
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="min-w-0" aria-live="polite">
          {on ? (
            <p className="flex flex-wrap items-center gap-3">
              <StatusBadge tone={reconnecting ? "warn" : "ok"}>{reconnecting ? "Reconnexion" : "En direct"}</StatusBadge>
              <span className="dk-mono text-[20px] text-foreground">{clock ?? "00:00:00"}</span>
              {state?.kbps != null && <span className="dk-mono text-[14px] text-muted">{fmtInt(state.kbps)} kbit/s</span>}
            </p>
          ) : (
            <p className="flex flex-wrap items-center gap-3">
              <StatusBadge tone={link === "error" ? "bad" : "neutral"}>{link === "error" ? "Serveur injoignable" : "Hors ligne"}</StatusBadge>
              <span className="text-[14px] text-muted">{data.lastEndedAt ? `Dernier direct ${fmtAgo(data.lastEndedAt)}` : "Aucun direct pour le moment"}</span>
            </p>
          )}
          {on && platforms.length > 0 && (
            <ul className="mt-4 flex gap-2" aria-label="Chaînes liées">
              {platforms.map((p) => (
                <li key={p}><PlatformLogo id={p} size={28} /></li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {on ? (
            <>
              <DkLink href="/dashboard/direct">Ouvrir le direct</DkLink>
              <DkLink href="/dashboard/direct" tone="danger">Terminer le stream</DkLink>
            </>
          ) : (
            <DkLink href="/dashboard/direct" tone="primary">Lancer un direct</DkLink>
          )}
        </div>
      </div>
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

export default function Overview({ initial, coreUrl = "", demo, platforms = [] }: { initial: OverviewData; coreUrl?: string; demo?: DevicesDemo; platforms?: string[] }) {
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
      <div className="grid gap-6">
        <StatusCard data={data} platforms={platforms} />

        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((k) => (
            <div key={k.label} className="dk-card !p-5">
              <dt className="dk-label">{k.label}</dt>
              <dd className="dk-mono mt-2 text-[20px] text-foreground">{k.value}</dd>
              <dd className="mt-1"><Change current={k.cur} previous={k.prev} /></dd>
            </div>
          ))}
        </dl>

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

        <div className="grid gap-6 md:grid-cols-2">
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
            {devices && devices.length > 0 && (
              <p className="mt-2 text-[13px] text-muted">
                {online.length} en ligne sur {devices.length}.{outdated && latest ? <span style={{ color: "var(--dk-amber)" }}> Plugin à mettre à jour ({latest.version}).</span> : ""}
              </p>
            )}
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
