"use client";

import { useMemo, useState } from "react";
import { useLiveStatus } from "@/components/dashboard/LiveStatus";
import { fmtAgo, fmtInt } from "@/lib/dashboard-data";
import { relayGroup, type RelayGroup, type RelayRow } from "@/lib/relay-groups";
import { flag, serverById } from "@/lib/relay-servers";
import RelayServer from "../illustrations/RelayServer";
import ProtocolBadge from "./ProtocolBadge";
import CreateRelayWizard from "./CreateRelayWizard";
import Link from "next/link";

// Page « Mes relais » : compteur, bouton de création, filtres, et serveurs classés automatiquement : en direct (pastille rouge) tout en haut, actifs au milieu, inactifs puis archivés en bas.

const GROUPS: { id: RelayGroup; label: string; mark: string }[] = [
  { id: "live", label: "En live", mark: "●" },
  { id: "active", label: "Actifs", mark: "○" },
  { id: "idle", label: "Inactifs", mark: "◌" },
];

type Props = {
  relays: RelayRow[];
  active: number;
  max: number;
  coreUrl: string;
  geo: { lat: number; lon: number } | null;
  /** Ouvre l'assistant au chargement (lien « Créer mon relais » de l'accueil : /dashboard/relais?nouveau=1). */
  autoOpen?: boolean;
};

export { ProtocolBadge };

export function ServerLabel({ id }: { id: string }) {
  const s = serverById(id);
  return (
    <span className="whitespace-nowrap">
      {s && (
        <span role="img" aria-label={s.country} className="mr-1.5">
          {flag(s.cc)}
        </span>
      )}
      {s?.city ?? id}
    </span>
  );
}

const COLS = "lg:grid-cols-[minmax(0,2fr)_96px_minmax(0,1.2fr)_110px_minmax(0,1.1fr)_110px_6.5rem]";

const STATE: Record<RelayGroup, { label: string; dot: string; text: string }> = {
  live: { label: "En direct", dot: "bg-live", text: "text-live" },
  active: { label: "Actif", dot: "bg-ok", text: "text-foreground" },
  idle: { label: "Inactif", dot: "bg-foreground/25", text: "text-muted" },
  archived: { label: "Archivé", dot: "bg-foreground/15", text: "text-muted" },
};

/** Ligne du tableau des serveurs : nom et état, protocole, région, dernier direct, débit moyen, actions. Sur mobile, la ligne devient une carte. */
function Row({ relay }: { relay: RelayRow }) {
  const g = relayGroup(relay);
  const st = STATE[g];
  return (
    <li className={`group relative grid grid-cols-1 gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-foreground/[0.04] sm:px-5 lg:items-center ${COLS}`}>
      <div className="flex min-w-0 items-center gap-3">
        {g === "live" ? <span className="live-dot shrink-0" aria-label="En direct" /> : <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${st.dot}`} />}
        <Link href={`/dashboard/relais/${relay.id}`} className="truncate text-left text-sm font-medium after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-1 focus-visible:after:ring-foreground/30">
          {relay.name}
        </Link>
        <span className={`shrink-0 text-xs lg:hidden ${st.text}`}>{st.label}</span>
      </div>
      <div className="flex items-center gap-3 lg:contents">
        <div className="lg:block">
          <ProtocolBadge protocol={relay.protocol} />
        </div>
        <div className="min-w-0 text-sm text-muted">
          <ServerLabel id={relay.server} />
        </div>
      </div>
      <div className={`hidden text-sm lg:flex lg:items-center ${st.text}`}>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={`size-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 text-sm text-muted lg:contents">
        <span>{g === "live" ? "En ce moment" : relay.last_live_at ? fmtAgo(relay.last_live_at) : "Jamais utilisé"}</span>
        <span className="font-mono tabular-nums lg:text-right">{relay.avg_kbps != null ? `${fmtInt(relay.avg_kbps)} kbps` : "-"}</span>
      </div>
      <span aria-hidden="true" className="hidden items-center justify-end gap-1.5 text-sm text-muted transition-colors group-hover:text-foreground lg:flex">
        Détails <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </li>
  );
}

export default function RelayList({ relays, active, max, coreUrl, geo, autoOpen = false }: Props) {
  const [wizard, setWizard] = useState(autoOpen && active < max);
  const [protocol, setProtocol] = useState<"all" | RelayRow["protocol"]>("all");
  const [server, setServer] = useState("all");
  const [q, setQ] = useState("");
  const { state } = useLiveStatus();

  // Statut en direct : le flux SSE du Core prime sur l'état lu au chargement de la page.
  const liveIds = useMemo(() => {
    if (!state?.relays) return null;
    return new Set(state.relays.filter((r) => r.live || r.reconnecting).map((r) => r.id));
  }, [state]);
  const withLive = relays.map((r) => ({ ...r, live: !r.archived && (liveIds ? liveIds.has(r.id) : r.live) }));

  const servers = [...new Set(relays.map((r) => r.server))];
  const needle = q.trim().toLowerCase();
  const shown = withLive.filter(
    (r) => (protocol === "all" || r.protocol === protocol) && (server === "all" || r.server === server) && (!needle || r.name.toLowerCase().includes(needle)),
  );
  const ORDER: Record<RelayGroup, number> = { live: 0, active: 1, idle: 2, archived: 3 };
  const rows = [...shown].sort((a, b) => ORDER[relayGroup(a)] - ORDER[relayGroup(b)]);
  const full = active >= max;
  const unlimited = max >= 1_000_000;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-page">
            Mes <em>serveurs</em>
          </h1>
          <p className="mt-2 font-mono text-sm tabular-nums text-muted">
            {active} / {unlimited ? "∞" : max} serveurs
          </p>
        </div>
        {full ? (
          <a href="https://discord.gg/CD68F8yZuZ" target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center whitespace-nowrap rounded-full border border-line px-6 text-sm font-medium transition-colors hover:bg-foreground/10">
            Limite atteinte · Demander plus de serveurs
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setWizard(true)}
            className="h-12 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98]"
          >
            + Créer un serveur
          </button>
        )}
      </div>

      {relays.length === 0 ? (
        <section className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-dashed border-line p-8 md:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Aucun serveur pour l&apos;instant</h2>
            <p className="mt-2 max-w-[55ch] text-sm leading-relaxed text-muted">
              Un serveur reçoit le flux de ton téléphone ou de ta caméra, et le renvoie à OBS. Crée-en un par appareil.
            </p>
            {!full && (
              <button
                type="button"
                onClick={() => setWizard(true)}
                className="mt-6 h-11 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98]"
              >
                Créer mon premier serveur
              </button>
            )}
          </div>
          <div className="mx-auto h-52 w-full max-w-[220px]">
            <RelayServer animated={false} className="h-full w-full" />
          </div>
        </section>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-end gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <span className="sr-only">Rechercher un serveur</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" className="h-10 w-44 rounded-full border border-line bg-background px-4 text-sm text-foreground placeholder:text-muted focus:border-line-strong focus:outline-none" />
              </label>
              <label>
                <span className="sr-only">Protocole</span>
                <select value={protocol} onChange={(e) => setProtocol(e.target.value as typeof protocol)} className="h-10 rounded-full border border-line bg-background px-4 text-sm text-foreground">
                  <option value="all">Tous les protocoles</option>
                  <option value="srtla">SRTLA</option>
                  <option value="rtmp">RTMP</option>
                </select>
              </label>
              {servers.length > 1 && (
                <label>
                  <span className="sr-only">Région</span>
                  <select value={server} onChange={(e) => setServer(e.target.value)} className="h-10 rounded-full border border-line bg-background px-4 text-sm text-foreground">
                    <option value="all">Toutes les régions</option>
                    {servers.map((sv) => (
                      <option key={sv} value={sv}>
                        {serverById(sv)?.city ?? sv}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">Aucun serveur ne correspond.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div role="presentation" className={`hidden gap-x-4 border-b border-line px-5 py-3 text-xs text-muted lg:grid ${COLS}`}>
                <span>Nom</span>
                <span>Protocole</span>
                <span>Région</span>
                <span>État</span>
                <span>Dernier direct</span>
                <span className="text-right">Débit moyen</span>
                <span aria-hidden="true" />
              </div>
              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <Row key={r.id} relay={r} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <CreateRelayWizard open={wizard} onClose={() => setWizard(false)} coreUrl={coreUrl} geo={geo} />
    </div>
  );
}
