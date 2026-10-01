"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
import PhoneMoblin from "../illustrations/PhoneMoblin";
import { DailyBars, Sparkline } from "./charts";
import { DashIllustration } from "./DashArt";
import { useLiveClock, useLiveStatus } from "./LiveStatus";
import MaskedUrl from "./MaskedUrl";
import MiniHealth from "./MiniHealth";
import { SessionList } from "./sessions";
import { ArrowLink, Tile, TileLabel } from "./ui";

// Vue d'ensemble du dashboard (grille bento) : statut, alertes, activité, dernier direct, histogramme,
// derniers directs, abonnement, URLs, santé, raccourcis. Données : /api/dashboard/overview (une requête).

// ─────────────── Bandeau de statut ───────────────

function StatusBanner({ data, onLaunch }: { data: OverviewData; onLaunch: () => void }) {
  const { state, link } = useLiveStatus();
  const clock = useLiveClock();
  const live = !!state?.live;
  const reconnecting = !!state?.reconnecting;

  return (
    <section
      aria-label="Statut du direct"
      className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${live || reconnecting ? "border-live/40" : "border-line"}`}
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm uppercase tracking-[0.12em]" aria-live="polite">
        {live || reconnecting ? (
          <>
            <span className="live-dot" aria-hidden="true" />
            <span className="text-foreground">{reconnecting ? "Reconnexion" : "En live"}</span>
            {clock && <span className="tabular-nums text-foreground">{clock}</span>}
            {state?.kbps != null && <span className="tabular-nums text-muted">{fmtInt(state.kbps)} kbps</span>}
            {state?.relays && state.relays.filter((r) => r.live).length > 1 ? (
              <span className="text-muted">{state.relays.filter((r) => r.live).length} relais</span>
            ) : (
              state?.relays?.find((r) => r.id === state.relay_id) && <span className="normal-case tracking-normal text-muted">{state.relays.find((r) => r.id === state.relay_id)!.name}</span>
            )}
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full border border-muted" aria-hidden="true" />
            <span className="text-foreground">{link === "error" ? "Relais injoignable" : "Hors ligne"}</span>
            {data.lastEndedAt && <span className="normal-case tracking-normal text-muted">dernier direct {fmtAgo(data.lastEndedAt)}</span>}
          </>
        )}
      </p>
      {live || reconnecting ? (
        <ArrowLink href="/dashboard/sante">Voir la santé</ArrowLink>
      ) : (
        <button
          type="button"
          onClick={onLaunch}
          className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98]"
        >
          Lancer un direct <span aria-hidden="true">→</span>
        </button>
      )}
    </section>
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

// ─────────────── Activité ───────────────

function Delta({ current, previous }: { current: number; previous: number }) {
  const d = delta(current, previous);
  if (!d) return <p className="mt-1 text-xs text-muted">rien sur la période précédente</p>;
  return (
    <p className={`mt-1 font-mono text-xs tabular-nums ${d.up ? "text-foreground" : "text-muted"}`}>
      <span aria-hidden="true">{d.up ? "▲" : "▼"}</span> {d.text}
      <span className="sr-only"> par rapport à la période précédente</span>
    </p>
  );
}

function Kpi({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="bg-background p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1.5 font-mono text-2xl tabular-nums tracking-tight text-foreground">{value}</p>
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
          className={`h-7 whitespace-nowrap rounded-full px-3 font-mono text-xs transition-colors ${range === r ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
        >
          {r === "7d" ? "7 j" : "30 j"}
        </button>
      ))}
    </div>
  );
}

function Activity({ data, range, onRange, pending }: { data: OverviewData; range: Range; onRange: (r: Range) => void; pending: boolean }) {
  const { kpis, previous } = data;
  return (
    <Tile aria-labelledby="activite">
      <TileLabel id="activite" right={<RangeToggle range={range} onChange={onRange} pending={pending} />}>
        Ton activité en direct
      </TileLabel>
      <div className={`mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line transition-opacity md:grid-cols-4 ${pending ? "opacity-50" : ""}`}>
        <Kpi label="Temps de direct" value={fmtDuration(kpis.seconds)}>
          <Delta current={kpis.seconds} previous={previous.seconds} />
        </Kpi>
        <Kpi label="Nombre de directs" value={fmtInt(kpis.count)}>
          <Delta current={kpis.count} previous={previous.count} />
        </Kpi>
        <Kpi label="Durée moyenne" value={kpis.count ? fmtDuration(kpis.avgSeconds) : "–"}>
          <Delta current={kpis.avgSeconds} previous={previous.avgSeconds} />
        </Kpi>
        <Kpi label="Débit moyen" value={kpis.avgKbps ? `${fmtInt(kpis.avgKbps)}` : "–"}>
          <p className="mt-1 font-mono text-xs text-muted">{kpis.peakKbps ? `kbit/s, crête à ${fmtInt(kpis.peakKbps)}` : "kbit/s"}</p>
        </Kpi>
      </div>
    </Tile>
  );
}

function LastLive({ s }: { s: NonNullable<OverviewData["last"]> }) {
  const facts: [string, string][] = [
    ["Appareil", deviceLabel(s)],
    ["Durée", fmtDuration(s.duration_s)],
    ["Coupures", fmtInt(s.reconnects)],
    ["Débit moyen", fmtKbps(s.avg_kbps)],
  ];
  return (
    <Tile aria-labelledby="dernier">
      <TileLabel id="dernier" right={<ArrowLink href={`/dashboard/lives/${s.id}`}>Voir le détail</ArrowLink>}>
        Dernier direct
      </TileLabel>
      <p className="mt-3 text-sm text-muted">{fmtDate(s.started_at)}</p>
      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-end">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-0.5 truncate font-mono text-sm tabular-nums text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <Sparkline points={s.bitrate_series} className="h-20 w-full" label={`Débit du direct, crête à ${fmtInt(s.peak_kbps)} kbit/s`} />
      </div>
    </Tile>
  );
}

function Onboarding({ keys }: { keys: OverviewData["keys"] }) {
  const steps = [
    { t: "Copier l'URL dans Moblin", d: "Réglages → Streams → URL." },
    { t: "Ajouter la source dans OBS", d: "Source Média, sans « Fichier local »." },
    { t: "Lancer", d: "Tes chiffres apparaissent ici après ton premier direct." },
  ];
  return (
    <Tile className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_220px]" aria-labelledby="onboarding">
      <div>
        <h2 id="onboarding" className="text-2xl font-semibold tracking-tight">
          Ton premier direct en trois gestes.
        </h2>
        <ol className="mt-6 space-y-4">
          {steps.map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line font-mono text-xs text-muted">{i + 1}</span>
              <span>
                <span className="block text-sm font-medium text-foreground">{s.t}</span>
                <span className="block text-sm text-muted">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>
        {keys ? (
          <div className="mt-6 max-w-xl">
            <MaskedUrl url={keys.moblin} label="Moblin" size="sm" />
          </div>
        ) : (
          <div className="mt-6">
            <ArrowLink href="/dashboard/relais">Créer mon premier relais</ArrowLink>
          </div>
        )}
      </div>
      <div className="mx-auto hidden h-56 w-full max-w-[220px] md:block">
        <PhoneMoblin />
      </div>
    </Tile>
  );
}

// ─────────────── Colonne droite ───────────────

function Subscription({ data }: { data: OverviewData }) {
  const { state } = useLiveStatus();
  const used = state?.relays ? state.relays.filter((r) => r.live || r.reconnecting).length : state?.live || state?.reconnecting ? 1 : 0;
  return (
    <Tile aria-labelledby="abonnement">
      <TileLabel id="abonnement">Ton abonnement</TileLabel>
      <p className="mt-4 text-xl font-semibold tracking-tight">{data.plan.name}</p>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted">Relais</span>
        <span className="font-mono tabular-nums">
          {data.relays.active} / {data.relays.max >= 1_000_000 ? "∞" : data.relays.max}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted">Flux simultanés</span>
        <span className="font-mono tabular-nums">
          {used} / {data.plan.streams}
        </span>
      </div>
      <div className="mt-5">
        <ArrowLink href="/offres">Voir les offres</ArrowLink>
      </div>
    </Tile>
  );
}

function Urls({ data }: { data: OverviewData }) {
  return (
    <Tile aria-labelledby="urls-courtes">
      <TileLabel id="urls-courtes">{data.keys ? data.keys.relay : "Tes URLs"}</TileLabel>
      {data.keys ? (
        <div className="mt-4 space-y-3">
          {(
            [
              ["Moblin", data.keys.moblin],
              ["SRT", data.keys.srt],
              ["OBS", data.keys.obs],
            ] as const
          ).map(([label, url]) => (
            <div key={label}>
              <p className="mb-1.5 text-xs text-muted">{label}</p>
              <MaskedUrl url={url} label={label} size="sm" />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          {data.coreStatus === "down"
            ? "Le relais ne répond pas pour le moment."
            : data.coreStatus === "off"
              ? "Le relais n'est pas encore branché au dashboard."
              : "Pas encore de relais."}
        </p>
      )}
      <div className="mt-5">
        <ArrowLink href="/dashboard/relais">Mes relais</ArrowLink>
      </div>
    </Tile>
  );
}

const shortcuts = [
  { label: "Scanner", href: "/dashboard/scanner" },
  { label: "Mes relais", href: "/dashboard/relais" },
  { label: "Statistiques", href: "/dashboard/stats" },
  { label: "Historique", href: "/dashboard/lives" },
];

function GoTo() {
  return (
    <Tile aria-labelledby="aller">
      <TileLabel id="aller">Aller à</TileLabel>
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {shortcuts.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="flex h-full items-center justify-between gap-2 rounded-xl border border-line px-3 py-3 text-sm text-muted transition-colors hover:bg-accent/10 hover:text-foreground"
            >
              {s.label}
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

// ─────────────── Page ───────────────

export default function Overview({ initial }: { initial: OverviewData }) {
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

  return (
    <div className="space-y-4">
      <StatusBanner data={data} onLaunch={() => setGuide(true)} />
      <LaunchGuide open={guide} onClose={() => setGuide(false)} keys={data.keys} />

      <Link
        href="/dashboard/scanner"
        className="group grid items-center gap-4 overflow-hidden rounded-2xl border border-line p-5 transition-colors hover:border-accent/35 hover:bg-accent/[0.08] sm:grid-cols-[minmax(0,1fr)_160px] sm:p-6"
      >
        <span>
          <span className="block text-2xl font-semibold tracking-tight">Scanner réseau</span>
          <span className="mt-1 block text-sm text-muted">Mesure la 4G / 5G là où tu es et fais avancer la carte communautaire.</span>
          <span className="mt-4 inline-flex items-center gap-2 text-sm text-foreground">
            Scanner
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none">
              →
            </span>
          </span>
        </span>
        <span className="hidden h-28 sm:block">
          <DashIllustration icon="scan" />
        </span>
      </Link>

      <Tile aria-labelledby="attention" className="py-4 sm:py-5">
        <TileLabel id="attention">Ce qui demande ton attention</TileLabel>
        {data.alerts.length ? (
          <ul className="mt-3 divide-y divide-accent/10">
            {data.alerts.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <p className="text-sm text-foreground">{a.text}</p>
                <ArrowLink href={a.href}>{a.cta}</ArrowLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Rien à traiter <span aria-hidden="true">✓</span>
          </p>
        )}
      </Tile>

      {error && (
        <p role="alert" className="text-sm text-red-400/90">
          Impossible de charger cette période. Réessaie dans un instant.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {data.hasEverStreamed ? (
            <>
              <Activity data={data} range={range} onRange={changeRange} pending={pending} />
              {data.last && <LastLive s={data.last} />}
              <Tile aria-labelledby="par-jour">
                <TileLabel id="par-jour">Temps de direct par jour</TileLabel>
                <div className="mt-6">
                  <DailyBars days={data.daily} />
                </div>
              </Tile>
              <Tile aria-labelledby="derniers">
                <TileLabel id="derniers" right={<ArrowLink href="/dashboard/lives">Tout l&apos;historique</ArrowLink>}>
                  3 derniers directs
                </TileLabel>
                <div className="mt-3">
                  <SessionList sessions={data.recent} />
                </div>
              </Tile>
            </>
          ) : (
            <Onboarding keys={data.keys} />
          )}
          <Link
            href="/dashboard/stats"
            className="group grid items-center gap-6 overflow-hidden rounded-2xl border border-line p-5 transition-colors hover:border-accent/35 hover:bg-accent/[0.08] sm:grid-cols-[minmax(0,1fr)_200px] sm:p-6"
          >
            <span>
              <span className="block text-2xl font-semibold tracking-tight sm:text-3xl">Découvrir tes statistiques</span>
              <span className="mt-2 block text-sm text-muted">Durées, débit, coupures : tes directs sur 7 et 30 jours.</span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm text-foreground">
                Ouvrir
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none">
                  →
                </span>
              </span>
            </span>
            <span className="hidden h-36 sm:block">
              <DashIllustration icon="stats" />
            </span>
          </Link>
        </div>

        <div className="space-y-4">
          <Subscription data={data} />
          <Urls data={data} />
          <MiniHealth />
          <GoTo />
        </div>
      </div>
    </div>
  );
}
