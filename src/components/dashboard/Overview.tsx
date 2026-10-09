"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Archive, ChartBar, ChatsCircle, Eye, MapTrifold, Radio, SlidersHorizontal, type IconProps } from "@/components/icons";
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
import { DailyBars, Sparkline } from "./charts";
import { useLiveClock, useLiveStatus } from "./LiveStatus";
import MaskedUrl from "./MaskedUrl";
import MesObs from "./MesObs";
import type { DevicesDemo } from "./useLinkDevices";
import { SessionList } from "./sessions";
import { ArrowLink, Tile, TileLabel } from "./ui";

// Vue d'ensemble du dashboard, en quatre niveaux : 1. l'état du direct et les actions, 2. ce qui demande une action,
// 3. les chiffres de la période, 4. le détail (activité, derniers directs) avec le chat, les URLs et les accès rapides.
// Données : /api/dashboard/overview (une requête).

// ─────────────── 1. Centre de contrôle ───────────────

const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full btn-tonal px-6 text-sm font-medium transition-colors active:scale-[0.98]";

/** Ligne fine de statut : « Hors ligne · dernier direct il y a X » + « Lancer un direct » ; en direct, le chrono et l'aperçu. */
function StatusLine({ data, onLaunch }: { data: OverviewData; onLaunch: () => void }) {
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
        <button type="button" onClick={onLaunch} className={btnPrimary}>
          Lancer un direct <span aria-hidden="true">→</span>
        </button>
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

// ─────────────── 3. Chiffres de la période ───────────────

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

function Kpi({ label, value, unit, children }: { label: string; value: string; unit?: string; children: ReactNode }) {
  return (
    <div className="tile p-4 sm:p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-mono text-3xl tabular-nums tracking-tight text-foreground">
        {value}
        {unit && <span className="ml-1.5 text-sm text-muted">{unit}</span>}
      </p>
      {children}
    </div>
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

function Kpis({ data, pending }: { data: OverviewData; pending: boolean }) {
  const { kpis, previous } = data;
  return (
    <div className={`grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4 ${pending ? "opacity-50" : ""}`}>
      <Kpi label="Temps de direct" value={fmtDuration(kpis.seconds)}>
        <Delta current={kpis.seconds} previous={previous.seconds} />
      </Kpi>
      <Kpi label="Nombre de directs" value={fmtInt(kpis.count)}>
        <Delta current={kpis.count} previous={previous.count} />
      </Kpi>
      <Kpi label="Durée moyenne" value={kpis.count ? fmtDuration(kpis.avgSeconds) : "-"}>
        <Delta current={kpis.avgSeconds} previous={previous.avgSeconds} />
      </Kpi>
      <Kpi label="Débit moyen" value={kpis.avgKbps ? fmtInt(kpis.avgKbps) : "-"} unit={kpis.avgKbps ? "kbit/s" : undefined}>
        <p className="mt-1 font-mono text-xs text-muted">{kpis.peakKbps ? `Crête ${fmtInt(kpis.peakKbps)} kbit/s` : "Pas de mesure"}</p>
      </Kpi>
    </div>
  );
}

// ─────────────── 4. Détail ───────────────

function DailyTile({ data, range, className = "" }: { data: OverviewData; range: Range; className?: string }) {
  const days = range === "7d" ? data.daily.slice(-7) : data.daily;
  return (
    <Tile aria-labelledby="par-jour" className={className}>
      <TileLabel id="par-jour">Temps de direct par jour</TileLabel>
      <div className="mt-6">
        <DailyBars days={days} />
      </div>
    </Tile>
  );
}

function LastLive({ s, timezone, className = "" }: { s: NonNullable<OverviewData["last"]>; timezone: string; className?: string }) {
  const facts: [string, string][] = [
    ["Appareil", deviceLabel(s)],
    ["Durée", fmtDuration(s.duration_s)],
    ["Coupures", fmtInt(s.reconnects)],
    ["Débit moyen", fmtKbps(s.avg_kbps)],
  ];
  return (
    <Tile aria-labelledby="dernier" className={className}>
      <TileLabel id="dernier" right={<ArrowLink href={`/dashboard/lives/${s.id}`}>Voir le détail</ArrowLink>}>
        Dernier direct
      </TileLabel>
      <p className="mt-1 text-sm text-muted">{fmtDate(s.started_at, timezone)}</p>
      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-end">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-0.5 truncate font-mono text-sm tabular-nums text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <Sparkline points={s.bitrate_series} startedAt={s.started_at} durationS={s.duration_s} className="h-20 w-full" label={`Débit du direct, crête à ${fmtInt(s.peak_kbps)} kbit/s`} />
      </div>
    </Tile>
  );
}

// ─────────────── Mini-guide « Lancer un direct » ───────────────

function LaunchGuide({ open, onClose, keys }: { open: boolean; onClose: () => void; keys: OverviewData["keys"] }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="launch-title"
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-line bg-background p-0 text-foreground backdrop:bg-background/80 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="launch-title" className="text-xl font-semibold tracking-tight">
            Lancer un direct
          </h2>
          <button type="button" onClick={onClose} className="-m-2 p-2 text-muted hover:text-foreground" aria-label="Fermer">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {keys ? (
          <ol className="mt-6 space-y-6">
            <li>
              <p className="text-sm font-medium">1. Colle l&apos;URL dans Moblin</p>
              <p className="mt-1 text-xs text-muted">Moblin → Réglages → Streams → ton stream → URL.</p>
              <div className="mt-2">
                <MaskedUrl url={keys.moblin} label="Moblin" size="sm" />
              </div>
            </li>
            <li>
              <p className="text-sm font-medium">2. Lance le direct dans Moblin</p>
              <p className="mt-1 text-xs text-muted">Le bandeau passe en « En live » quelques secondes après.</p>
            </li>
            <li>
              <p className="text-sm font-medium">3. Vérifie OBS</p>
              <p className="mt-1 text-xs text-muted">Source Média → décocher « Fichier local » → cette URL.</p>
              <div className="mt-2">
                <MaskedUrl url={keys.obs} label="OBS" size="sm" />
              </div>
            </li>
          </ol>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Crée d&apos;abord un relais dans{" "}
            <Link href="/dashboard/relais" className="text-foreground underline underline-offset-4">
              Mes relais
            </Link>
            .
          </p>
        )}
      </div>
    </dialog>
  );
}

type Shortcut = { label: string; href: string; icon: ComponentType<IconProps> };
const shortcuts: Shortcut[] = [
  { label: "Contrôle à distance", href: "/dashboard/controle-a-distance", icon: SlidersHorizontal },
  { label: "Aperçu", href: "/dashboard/apercu", icon: Eye },
  { label: "Mes relais", href: "/dashboard/relais", icon: Radio },
  { label: "Multichat", href: "/dashboard/multichat", icon: ChatsCircle },
  { label: "Backups de scènes", href: "/dashboard/backups", icon: Archive },
  { label: "Scanner", href: "/dashboard/scanner", icon: MapTrifold },
  { label: "Statistiques", href: "/dashboard/stats", icon: ChartBar },
];

function GoTo() {
  return (
    <Tile aria-labelledby="aller">
      <TileLabel id="aller">Aller à</TileLabel>
      <ul className="mt-3 grid gap-1">
        {shortcuts.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground">
              <s.icon size={18} aria-hidden="true" />
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

function Plan({ data }: { data: OverviewData }) {
  const unlimited = data.relays.max >= 1_000_000;
  return (
    <Tile aria-labelledby="formule">
      <TileLabel id="formule" right={<ArrowLink href="/dashboard/abonnement">Gérer</ArrowLink>}>
        Ta formule
      </TileLabel>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{data.plan.name}</p>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-muted">Serveurs actifs</dt>
          <dd className="mt-0.5 font-mono tabular-nums">
            {data.relays.active} / {unlimited ? "∞" : data.relays.max}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Directs simultanés</dt>
          <dd className="mt-0.5 font-mono tabular-nums">{data.plan.streams >= 1_000_000 ? "∞" : data.plan.streams}</dd>
        </div>
      </dl>
    </Tile>
  );
}

// ─────────────── Page ───────────────

export default function Overview({ initial, coreUrl = "", demo }: { initial: OverviewData; coreUrl?: string; demo?: DevicesDemo }) {
  const [range, setRange] = useState<Range>(initial.range);
  const [data, setData] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [guide, setGuide] = useState(false);
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
    <div className="space-y-8">
      {/* En-tête : titre, période, action principale */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-page">Vue d&apos;<em>ensemble</em></h1>
          <p className="mt-2 text-sm text-muted">L&apos;état de ton direct et l&apos;activité de tes serveurs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RangeToggle range={range} onChange={changeRange} pending={pending} />
        </div>
      </div>

      <StatusLine data={data} onLaunch={() => setGuide(true)} />
      <LaunchGuide open={guide} onClose={() => setGuide(false)} keys={data.keys} />
      {data.alerts.length > 0 && <Alerts alerts={data.alerts} />}

      {/* Activité : chiffres séparés par des filets, puis le graphique, dans un seul bloc */}
      <section aria-labelledby="activite" className="overflow-hidden rounded-2xl border border-line bg-surface">
        <h2 id="activite" className="sr-only">Activité en direct</h2>
        <dl className={`grid grid-cols-2 divide-line transition-opacity max-lg:divide-y lg:grid-cols-4 lg:divide-x ${pending ? "opacity-50" : ""}`}>
          {stats.map((k, i) => (
            <div key={k.label} className={`p-5 sm:p-6 ${i % 2 === 1 ? "max-lg:border-l max-lg:border-line" : ""} ${i > 1 ? "max-lg:border-t max-lg:border-line" : ""}`}>
              <dt className="text-xs text-muted">{k.label}</dt>
              <dd className="mt-3 font-mono text-3xl tabular-nums tracking-tight">
                {k.value}
                {k.unit && <span className="ml-1.5 text-sm text-muted">{k.unit}</span>}
              </dd>
              {k.sub}
            </div>
          ))}
        </dl>
        <div className="border-t border-line p-5 sm:p-6">
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
            <div className="grid place-items-center py-10 text-center">
              <p className="text-sm font-medium">Aucun direct pour le moment</p>
              <p className="mt-1 max-w-[44ch] text-sm text-muted">Tes chiffres apparaissent ici après ton premier direct.</p>
              <button type="button" onClick={() => setGuide(true)} className={`${btnPrimary} mt-5`}>
                Lancer un direct <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Derniers directs : tableau */}
        <section aria-labelledby="derniers" className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="derniers" className="text-sm font-semibold">Derniers directs</h2>
            <ArrowLink href="/dashboard/lives">Tout l&apos;historique</ArrowLink>
          </div>
          {data.recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">Aucun direct enregistré.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_100px_130px] gap-4 border-b border-line px-5 py-2.5 text-xs text-muted sm:grid">
                <span>Serveur</span>
                <span>Date</span>
                <span className="text-right">Durée</span>
                <span className="text-right">Débit moyen</span>
              </div>
              <ul className="divide-y divide-line">
                {data.recent.slice(0, 6).map((s) => (
                  <li key={s.id}>
                    <Link href={`/dashboard/lives/${s.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-5 py-3.5 text-sm transition-colors hover:bg-foreground/[0.04] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_100px_130px]">
                      <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5">
                        <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${s.ended_at ? "bg-muted" : "bg-ok"}`} />
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
        </section>

        <aside className="min-w-0 space-y-8">
          <Plan data={data} />
          <MesObs coreUrl={coreUrl} demo={demo} />
        </aside>
      </div>
    </div>
  );
}
