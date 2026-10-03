"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ChartBar, ChatsCircle, Eye, MapTrifold, Radio, SlidersHorizontal, type IconProps } from "@phosphor-icons/react";
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
import { useLiveClock, useLiveStatus } from "./LiveStatus";
import MaskedUrl from "./MaskedUrl";
import MultiChat, { type ChatDefaults } from "./MultiChat";
import LiveNow from "./LiveNow";
import { SessionList } from "./sessions";
import { ArrowLink, Tile, TileLabel } from "./ui";

// Vue d'ensemble du dashboard, en quatre niveaux : 1. l'état du direct et les actions, 2. ce qui demande une action,
// 3. les chiffres de la période, 4. le détail (activité, derniers directs) avec le chat, les URLs et les accès rapides.
// Données : /api/dashboard/overview (une requête).

// ─────────────── 1. Centre de contrôle ───────────────

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-mono text-sm tabular-nums text-foreground">{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-lg transition-opacity hover:opacity-70">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}

const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98]";
const btnGhost = "inline-flex h-11 items-center whitespace-nowrap rounded-full border border-line-strong px-5 text-sm transition-colors hover:bg-foreground/10";

function ControlCenter({ data, onLaunch }: { data: OverviewData; onLaunch: () => void }) {
  const { state, link } = useLiveStatus();
  const clock = useLiveClock();
  const live = !!state?.live;
  const reconnecting = !!state?.reconnecting;
  const on = live || reconnecting;
  const used = state?.relays ? state.relays.filter((r) => r.live || r.reconnecting).length : on ? 1 : 0;
  const liveName = state?.relays?.find((r) => r.id === state.relay_id)?.name;
  const unlimited = data.relays.max >= 1_000_000;

  return (
    <section aria-label="Statut du direct" className={`rounded-2xl border bg-surface p-5 sm:p-7 ${on ? "border-live/40" : "border-line"}`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div aria-live="polite">
          <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.16em] text-muted">
            {on ? <span className="live-dot" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full border border-muted" aria-hidden="true" />}
            {on ? (reconnecting ? "Reconnexion" : "En live") : link === "error" ? "Relais injoignable" : "Hors ligne"}
          </p>
          {on ? (
            <>
              <p className="mt-3 font-mono text-4xl tabular-nums tracking-tight text-foreground sm:text-5xl">{clock ?? "00:00:00"}</p>
              <p className="mt-2 text-sm text-muted">
                {state?.kbps != null && <span className="font-mono tabular-nums text-foreground">{fmtInt(state.kbps)} kbit/s</span>}
                {(used > 1 || liveName) && (
                  <span>
                    {state?.kbps != null ? " sur " : "Sur "}
                    {used > 1 ? `${used} relais` : liveName}
                  </span>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Aucun direct en cours</p>
              <p className="mt-2 text-sm text-muted">{data.lastEndedAt ? `Dernier direct ${fmtAgo(data.lastEndedAt)}.` : "Ton premier direct apparaîtra ici."}</p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {on ? (
            <>
              <Link href="/dashboard/apercu" className={btnPrimary}>
                Ouvrir l&apos;aperçu <span aria-hidden="true">→</span>
              </Link>
              <Link href="/dashboard/relais" className={btnGhost}>
                Mes relais
              </Link>
            </>
          ) : (
            <>
              <button type="button" onClick={onLaunch} className={btnPrimary}>
                Lancer un direct <span aria-hidden="true">→</span>
              </button>
              <Link href="/dashboard/relais" className={btnGhost}>
                Mes relais
              </Link>
            </>
          )}
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-4">
        <Stat label="Formule" value={data.plan.name} href="/dashboard/abonnement" />
        <Stat label="Relais actifs" value={`${data.relays.active} / ${unlimited ? "∞" : data.relays.max}`} href="/dashboard/relais" />
        <Stat label="Flux simultanés" value={`${used} / ${data.plan.streams}`} />
        <Stat label="Dernier direct" value={data.last ? fmtDuration(data.last.duration_s) : "–"} href={data.last ? `/dashboard/lives/${data.last.id}` : undefined} />
      </dl>
    </section>
  );
}

// ─────────────── 2. À vérifier ───────────────

function Alerts({ alerts }: { alerts: OverviewData["alerts"] }) {
  if (!alerts.length) return null;
  return (
    <section aria-labelledby="attention">
      <h2 id="attention" className="mb-3 flex items-center gap-2 text-sm font-semibold">
        À vérifier
        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-xs font-normal tabular-nums text-muted">{alerts.length}</span>
      </h2>
      <ul className={`grid gap-3 ${alerts.length === 1 ? "" : alerts.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
        {alerts.map((a) => (
          <li key={a.id} className="flex flex-col justify-between gap-4 rounded-xl border border-line border-l-2 border-l-accent bg-surface p-4">
            <p className="text-sm leading-relaxed text-foreground">{a.text}</p>
            <ArrowLink href={a.href}>{a.cta}</ArrowLink>
          </li>
        ))}
      </ul>
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
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
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
      <Kpi label="Durée moyenne" value={kpis.count ? fmtDuration(kpis.avgSeconds) : "–"}>
        <Delta current={kpis.avgSeconds} previous={previous.avgSeconds} />
      </Kpi>
      <Kpi label="Débit moyen" value={kpis.avgKbps ? fmtInt(kpis.avgKbps) : "–"} unit={kpis.avgKbps ? "kbit/s" : undefined}>
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
      <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-end">
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

function Urls({ data }: { data: OverviewData }) {
  return (
    <Tile aria-labelledby="urls-courtes" className="flex flex-col">
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
      <div className="mt-auto pt-5">
        <ArrowLink href="/dashboard/relais">Mes relais</ArrowLink>
      </div>
    </Tile>
  );
}


type Shortcut = { label: string; href: string; icon: ComponentType<IconProps>; soon?: boolean };
const shortcuts: Shortcut[] = [
  { label: "Aperçu", href: "/dashboard/apercu", icon: Eye },
  { label: "Multichat", href: "/dashboard/multichat", icon: ChatsCircle },
  { label: "Mes relais", href: "/dashboard/relais", icon: Radio },
  { label: "Scanner", href: "/dashboard/scanner", icon: MapTrifold },
  { label: "Statistiques", href: "/dashboard/stats", icon: ChartBar },
  { label: "SYXTEE COMMUTATEUR", href: "/commutateur", icon: SlidersHorizontal, soon: true },
];

function ChatTile({ chat }: { chat: ChatDefaults }) {
  if (!(chat.twitch || chat.kick))
    return (
      <Tile aria-labelledby="chat-setup" className="flex flex-col">
        <TileLabel id="chat-setup">Multichat</TileLabel>
        <p className="mt-3 text-sm leading-relaxed text-muted">YouTube, Twitch et Kick au même endroit. Connecte ton compte pour le voir ici.</p>
        <div className="mt-auto pt-4">
          <ArrowLink href="/dashboard/multichat">Configurer le chat</ArrowLink>
        </div>
      </Tile>
    );
  return (
    <div className="flex min-h-[22rem] flex-col">
      <div className="mb-3">
        <TileLabel right={<ArrowLink href="/dashboard/multichat">Multichat</ArrowLink>}>Chat</TileLabel>
      </div>
      <MultiChat defaults={chat} height="min-h-0 flex-1" compact />
    </div>
  );
}

function GoTo() {
  return (
    <section aria-labelledby="aller">
      <h2 id="aller" className="mb-3 text-sm font-semibold">
        Accès rapides
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {shortcuts.map((s) =>
          s.soon ? (
            <li key={s.href}>
              <div aria-disabled="true" className="flex h-full flex-col gap-4 rounded-xl border border-line bg-surface p-4 text-muted">
                <s.icon size={22} aria-hidden="true" />
                <span className="text-sm font-medium">{s.label}</span>
                <span className="w-fit rounded border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]">À venir</span>
              </div>
            </li>
          ) : (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex h-full flex-col gap-4 rounded-xl border border-line bg-surface p-4 text-muted transition-colors hover:border-line-strong hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <s.icon size={22} aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">{s.label}</span>
              </Link>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

// ─────────────── Page ───────────────

export default function Overview({ initial, chat = { twitch: "", kick: "", youtube: "" } }: { initial: OverviewData; chat?: ChatDefaults }) {
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
    <div className="space-y-8">
      <ControlCenter data={data} onLaunch={() => setGuide(true)} />
      <LaunchGuide open={guide} onClose={() => setGuide(false)} keys={data.keys} />
      <LiveNow sources={data.sources} />
      <Alerts alerts={data.alerts} />

      {data.hasEverStreamed ? (
        <section aria-labelledby="periode" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="periode" className="text-sm font-semibold">
              Ton activité
            </h2>
            <RangeToggle range={range} onChange={changeRange} pending={pending} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-400/90">
              Impossible de charger cette période. Réessaie dans un instant.
            </p>
          )}
          <Kpis data={data} pending={pending} />
        </section>
      ) : (
        <Onboarding keys={data.keys} />
      )}

      {/* Trois rangées de même structure (2/3 + 1/3) : chaque tuile remplit sa cellule, les bords haut et bas sont alignés. */}
      {data.hasEverStreamed && (
        <div className="grid gap-4 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
          <DailyTile data={data} range={range} className="lg:col-span-2" />
          <ChatTile chat={chat} />
          {data.last ? <LastLive s={data.last} timezone={data.timezone} className="lg:col-span-2" /> : <div className="hidden lg:col-span-2 lg:block" />}
          <Urls data={data} />
        </div>
      )}
      {!data.hasEverStreamed && (
        <div className="grid gap-4 lg:grid-cols-3">
          <ChatTile chat={chat} />
          <Urls data={data} />
        </div>
      )}
      {data.hasEverStreamed && (
        <Tile aria-labelledby="derniers">
          <TileLabel id="derniers" right={<ArrowLink href="/dashboard/lives">Tout l&apos;historique</ArrowLink>}>
            Derniers directs
          </TileLabel>
          <div className="mt-3">
            <SessionList sessions={data.recent} timezone={data.timezone} />
          </div>
        </Tile>
      )}

      <GoTo />
    </div>
  );
}
