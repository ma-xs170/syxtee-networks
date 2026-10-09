"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import {
  delta,
  deviceLabel,
  fmtAgo,
  fmtDate,
  fmtDuration,
  fmtInt,
  fmtKbps,
  type Overview as OverviewData,
  type Range,
} from "@/lib/dashboard-data";
import { DailyBars } from "./charts";
import { useLiveClock, useLiveStatus } from "./LiveStatus";
import MesObs from "./MesObs";
import type { DevicesDemo } from "./useLinkDevices";
import { ArrowLink } from "./ui";
import { Card, Fact, Pill } from "./panel";

// Accueil du dashboard, toujours dans le même ordre : 1. l'état du direct et l'action, 2. ce qui demande ton attention,
// 3. à gauche l'activité puis les derniers directs, à droite Mes OBS, la formule et les raccourcis. Toutes les cartes sont des Card.
// Données : /api/dashboard/overview (une requête).

// ─────────────── 1. Centre de contrôle ───────────────

const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full btn-tonal px-6 text-sm font-medium transition-colors active:scale-[0.98]";

/** Ligne fine de statut : « Hors ligne · dernier direct il y a X » + « Lancer un direct » ; en direct, le chrono et l'aperçu. */
function StatusLine({ data }: { data: OverviewData }) {
  const { state, link } = useLiveStatus();
  const clock = useLiveClock();
  const reconnecting = !!state?.reconnecting;
  const on = !!state?.live || reconnecting;
  const liveName = state?.relays?.find((r) => r.id === state.relay_id)?.name;
  return (
    <section aria-label="Statut du direct" className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border bg-surface px-5 py-4 ${on ? "border-live/40" : "border-line"}`}>
      <p aria-live="polite" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.16em]">
          {on ? <span className="live-dot" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full border border-muted" aria-hidden="true" />}
          {on ? (reconnecting ? "Reconnexion" : "En direct") : link === "error" ? "Relais injoignable" : "Hors ligne"}
        </span>
        {on ? (
          <span className="font-mono tabular-nums text-foreground">
            {clock ?? "00:00:00"}
            {state?.kbps != null && <span className="ml-3 text-muted">{fmtInt(state.kbps)} kbit/s</span>}
            {liveName && <span className="ml-3 font-sans text-muted">sur {liveName}</span>}
          </span>
        ) : (
          <span className="text-muted">{data.lastEndedAt ? `Dernier direct ${fmtAgo(data.lastEndedAt)}` : "Aucun direct pour le moment"}</span>
        )}
      </p>
      {on ? (
        <Link href="/dashboard/apercu" className={btnPrimary}>
          Ouvrir l&apos;aperçu <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <Link href="/dashboard/controle-a-distance" className={btnPrimary}>
          Lancer un direct <span aria-hidden="true">→</span>
        </Link>
      )}
    </section>
  );
}

// ─────────────── 2. À vérifier ───────────────

function Alerts({ alerts }: { alerts: OverviewData["alerts"] }) {
  return (
    <section aria-labelledby="attention" className="tile p-4 sm:p-5">
      <h2 id="attention" className="flex items-center gap-2 text-sm font-semibold">
        Ce qui demande ton attention
        {alerts.length > 0 && <span className="rounded-full border border-line px-2 py-0.5 font-mono text-xs font-normal tabular-nums text-muted">{alerts.length}</span>}
      </h2>
      {alerts.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Rien à signaler.</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {alerts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-accent pl-3">
              <p className="text-sm leading-relaxed">{a.text}</p>
              <ArrowLink href={a.href}>{a.cta}</ArrowLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Delta({ current, previous }: { current: number; previous: number }) {
  const d = delta(current, previous);
  if (!d) return <p className="mt-1 text-xs text-muted">Pas de période précédente</p>;
  return (
    <p className={`mt-1 font-mono text-xs tabular-nums ${d.up ? "text-foreground" : "text-muted"}`}>
      <span aria-hidden="true">{d.up ? "▲" : "▼"}</span> {d.text}
      <span className="sr-only"> par rapport à la période précédente</span>
    </p>
  );
}

function RangeToggle({ range, onChange, pending }: { range: Range; onChange: (r: Range) => void; pending: boolean }) {
  return (
    <div role="radiogroup" aria-label="Période" className="inline-flex shrink-0 rounded-full border border-line p-0.5" aria-busy={pending}>
      {(["7d", "30d"] as const).map((r) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={range === r}
          onClick={() => onChange(r)}
          className={`h-8 whitespace-nowrap rounded-full px-3.5 font-mono text-xs transition-colors ${range === r ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
        >
          {r === "7d" ? "7 jours" : "30 jours"}
        </button>
      ))}
    </div>
  );
}

// ─────────────── Colonne de droite ───────────────

function Plan({ data }: { data: OverviewData }) {
  const unlimited = data.relays.max >= 1_000_000;
  return (
    <Card title="Ta formule" action={<ArrowLink href="/dashboard/abonnement">Gérer</ArrowLink>}>
      <dl className="divide-y divide-line">
        <Fact label="Formule"><Pill>{data.plan.name}</Pill></Fact>
        <Fact label="Serveurs actifs"><span className="font-mono tabular-nums">{data.relays.active} / {unlimited ? "∞" : data.relays.max}</span></Fact>
        <Fact label="Directs simultanés"><span className="font-mono tabular-nums">{data.plan.streams >= 1_000_000 ? "∞" : data.plan.streams}</span></Fact>
      </dl>
    </Card>
  );
}

const shortcuts = [
  { label: "Aperçu du direct", href: "/dashboard/apercu" },
  { label: "Scanner réseau", href: "/dashboard/scanner" },
  { label: "Assistance", href: "/dashboard/support" },
];

function Shortcuts() {
  return (
    <Card title="Raccourcis">
      <ul className="divide-y divide-line">
        {shortcuts.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex min-h-[3.5rem] items-center justify-between gap-4 py-3 text-[15px] transition-colors hover:text-foreground">
              {s.label}
              <span aria-hidden="true" className="text-muted">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ─────────────── Page ───────────────

export default function Overview({ initial, coreUrl = "", demo }: { initial: OverviewData; coreUrl?: string; demo?: DevicesDemo }) {
  const [range, setRange] = useState<Range>(initial.range);
  const [data, setData] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const cache = useRef(new Map<Range, OverviewData>([[initial.range, initial]]));

  async function changeRange(r: Range) {
    setRange(r);
    const hit = cache.current.get(r);
    if (hit) return setData(hit);
    setPending(true);
    setError(false);
    try {
      const res = await fetch(`/api/dashboard/overview?range=${r}`);
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as OverviewData;
      cache.current.set(r, next);
      setData(next);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  const { kpis, previous } = data;
  const stats: { label: string; value: string; unit?: string; sub: ReactNode }[] = [
    { label: "Temps de direct", value: fmtDuration(kpis.seconds), sub: <Delta current={kpis.seconds} previous={previous.seconds} /> },
    { label: "Directs", value: fmtInt(kpis.count), sub: <Delta current={kpis.count} previous={previous.count} /> },
    { label: "Durée moyenne", value: kpis.count ? fmtDuration(kpis.avgSeconds) : "-", sub: <Delta current={kpis.avgSeconds} previous={previous.avgSeconds} /> },
    { label: "Débit moyen", value: kpis.avgKbps ? fmtInt(kpis.avgKbps) : "-", unit: kpis.avgKbps ? "kbit/s" : undefined, sub: <p className="mt-1 font-mono text-xs text-muted">{kpis.peakKbps ? `Crête ${fmtInt(kpis.peakKbps)}` : "Pas de mesure"}</p> },
  ];
  const days = range === "7d" ? data.daily.slice(-7) : data.daily;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-page">Accueil</h1>
        <p className="mt-2 text-sm text-muted">L&apos;état de ton direct et l&apos;activité de tes serveurs.</p>
      </div>

      <StatusLine data={data} />
      {data.alerts.length > 0 && <Alerts alerts={data.alerts} />}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card title="Activité" action={<RangeToggle range={range} onChange={changeRange} pending={pending} />}>
            <dl className={`-mx-6 grid grid-cols-2 divide-line transition-opacity max-lg:divide-y lg:grid-cols-4 lg:divide-x ${pending ? "opacity-50" : ""}`}>
              {stats.map((k, i) => (
                <div key={k.label} className={`p-5 ${i % 2 === 1 ? "max-lg:border-l max-lg:border-line" : ""} ${i > 1 ? "max-lg:border-t max-lg:border-line" : ""}`}>
                  <dt className="text-xs text-muted">{k.label}</dt>
                  <dd className="mt-2 font-mono text-2xl tabular-nums tracking-tight">
                    {k.value}
                    {k.unit && <span className="ml-1.5 text-sm text-muted">{k.unit}</span>}
                  </dd>
                  {k.sub}
                </div>
              ))}
            </dl>
            <div className="-mx-6 border-t border-line p-5">
              {error && (
                <p role="alert" className="mb-3 text-sm text-red-400/90">
                  Impossible de charger cette période. Réessaie dans un instant.
                </p>
              )}
              {data.hasEverStreamed ? (
                <>
                  <p className="mb-4 text-xs text-muted">Temps de direct par jour</p>
                  <DailyBars days={days} />
                </>
              ) : (
                <div className="grid place-items-center py-8 text-center">
                  <p className="text-sm font-medium">Aucun direct pour le moment</p>
                  <p className="mt-1 max-w-[44ch] text-sm text-muted">Tes chiffres apparaissent ici après ton premier direct.</p>
                  <Link href="/dashboard/controle-a-distance" className={`${btnPrimary} mt-5`}>
                    Lancer un direct <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </div>
          </Card>

          <Card title="Derniers directs" action={<ArrowLink href="/dashboard/lives">Tout l&apos;historique</ArrowLink>}>
            {data.recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Aucun direct enregistré.</p>
            ) : (
              <div className="-mx-6">
                <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_100px_130px] gap-4 border-b border-line px-6 py-2.5 text-xs text-muted sm:grid">
                  <span>Serveur</span>
                  <span>Date</span>
                  <span className="text-right">Durée</span>
                  <span className="text-right">Débit moyen</span>
                </div>
                <ul className="divide-y divide-line">
                  {data.recent.slice(0, 6).map((s) => (
                    <li key={s.id}>
                      <Link href={`/dashboard/lives/${s.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-6 py-3.5 text-sm transition-colors hover:bg-foreground/[0.04] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_100px_130px]">
                        <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5">
                          <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${s.ended_at ? "bg-muted" : "bg-live"}`} />
                          <span className="truncate font-medium">{deviceLabel(s)}</span>
                          {s.reconnects > 0 && <span className="shrink-0 font-mono text-xs text-muted">{s.reconnects} coupure{s.reconnects > 1 ? "s" : ""}</span>}
                        </span>
                        <span className="col-start-1 row-start-2 truncate text-xs text-muted sm:col-start-2 sm:row-start-1 sm:text-sm">{fmtDate(s.started_at, data.timezone)}</span>
                        <span className="col-start-2 row-start-1 text-right font-mono tabular-nums sm:col-start-3">{s.ended_at ? fmtDuration(s.duration_s) : "En cours"}</span>
                        <span className="hidden text-right font-mono text-muted tabular-nums sm:col-start-4 sm:row-start-1 sm:block">{fmtKbps(s.avg_kbps)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-6">
          <MesObs coreUrl={coreUrl} demo={demo} />
          <Plan data={data} />
          <Shortcuts />
        </aside>
      </div>
    </div>
  );
}
