"use client";

import { useMemo, useState } from "react";
import { useLiveStatus } from "@/components/dashboard/LiveStatus";
import { fmtAgo, fmtInt } from "@/lib/dashboard-data";
import { relayGroup, type RelayGroup, type RelayRow } from "@/lib/relay-groups";
import { flag, serverById } from "@/lib/relay-servers";
import RelayServer from "../illustrations/RelayServer";
import ProtocolBadge from "./ProtocolBadge";
import CreateRelayWizard from "./CreateRelayWizard";
import RelayActions from "./RelayActions";
import RelayDetailModal from "./RelayDetailModal";

// Page « Mes relais » : compteur, bouton de création, filtres, et relais classés (en live, actifs, inactifs, archivés).

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

function Row({ relay, live, onOpen }: { relay: RelayRow; live: boolean; onOpen: (r: RelayRow) => void }) {
  return (
    <li className="grid grid-cols-1 gap-4 rounded-2xl border border-line p-4 transition-colors hover:border-foreground/30 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {live ? <span className="live-dot" aria-label="En live" /> : <span className="h-2 w-2 rounded-full border border-muted" aria-hidden="true" />}
          <button type="button" onClick={() => onOpen(relay)} className="truncate text-left text-base font-medium underline-offset-4 hover:underline">
            {relay.name}
          </button>
          <ProtocolBadge protocol={relay.protocol} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:flex sm:flex-wrap">
          <div>
            <dt className="sr-only">Serveur</dt>
            <dd className="text-muted">
              <ServerLabel id={relay.server} />
            </dd>
          </div>
          <div>
            <dt className="sr-only">Dernier live</dt>
            <dd className={live ? "text-foreground" : "text-muted"}>
              {live ? "En live" : relay.last_live_at ? `Dernier live ${fmtAgo(relay.last_live_at)}` : "Jamais utilisé"}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Débit moyen sur 30 jours</dt>
            <dd className="font-mono tabular-nums text-muted">{relay.avg_kbps != null ? `${fmtInt(relay.avg_kbps)} kbps moy.` : "Pas de débit"}</dd>
          </div>
        </dl>
      </div>
      <RelayActions relay={relay} onView={() => onOpen(relay)} />
    </li>
  );
}

export default function RelayList({ relays, active, max, coreUrl, geo, autoOpen = false }: Props) {
  const [wizard, setWizard] = useState(autoOpen && active < max);
  const [protocol, setProtocol] = useState<"all" | RelayRow["protocol"]>("all");
  const [server, setServer] = useState("all");
  const [q] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { state } = useLiveStatus();

  // Statut en direct : le flux SSE du Core prime sur l'état lu au chargement de la page.
  const liveIds = useMemo(() => {
    if (!state?.relays) return null;
    return new Set(state.relays.filter((r) => r.live || r.reconnecting).map((r) => r.id));
  }, [state]);
  const withLive = relays.map((r) => ({ ...r, live: !r.archived && (liveIds ? liveIds.has(r.id) : r.live) }));

  const opened = withLive.find((r) => r.id === openId) ?? null;
  const servers = [...new Set(relays.map((r) => r.server))];
  const needle = q.trim().toLowerCase();
  const shown = withLive.filter(
    (r) => (protocol === "all" || r.protocol === protocol) && (server === "all" || r.server === server) && (!needle || r.name.toLowerCase().includes(needle)),
  );
  const archived = shown.filter((r) => r.archived);
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
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="Protocole" className="flex rounded-full border border-line p-1">
              {(["all", "srtla", "rtmp"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={protocol === p}
                  onClick={() => setProtocol(p)}
                  className={`h-8 rounded-full px-3 text-xs font-medium uppercase tracking-wide transition-colors ${protocol === p ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
                >
                  {p === "all" ? "Tous" : p}
                </button>
              ))}
            </div>
            {servers.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-muted">
                <span className="sr-only">Serveur</span>
                <select value={server} onChange={(e) => setServer(e.target.value)} className="h-10 rounded-full border border-line bg-background px-3 text-sm text-foreground">
                  <option value="all">Tous les serveurs</option>
                  {servers.map((s) => (
                    <option key={s} value={s}>
                      {serverById(s)?.city ?? s}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="space-y-8">
            {GROUPS.map((g) => {
              const items = shown.filter((r) => relayGroup(r) === g.id);
              if (!items.length) return null;
              return (
                <section key={g.id} aria-labelledby={`g-${g.id}`}>
                  <h2 id={`g-${g.id}`} className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <span aria-hidden="true" className={g.id === "live" ? "text-live" : "text-muted"}>
                      {g.mark}
                    </span>
                    {g.label}
                    <span className="text-muted">{items.length}</span>
                  </h2>
                  <ul className="space-y-3">
                    {items.map((r) => (
                      <Row key={r.id} relay={r} live={g.id === "live"} onOpen={(x) => setOpenId(x.id)} />
                    ))}
                  </ul>
                </section>
              );
            })}
            {shown.length === archived.length && archived.length === 0 && <p className="text-sm text-muted">Aucun serveur ne correspond à ta recherche.</p>}
            {archived.length > 0 && (
              <section aria-labelledby="g-archived">
                <button
                  type="button"
                  id="g-archived"
                  aria-expanded={showArchived}
                  onClick={() => setShowArchived((v) => !v)}
                  className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
                >
                  <span aria-hidden="true" className={`inline-block transition-transform motion-reduce:transition-none ${showArchived ? "rotate-90" : ""}`}>
                    ›
                  </span>
                  Archivés <span>{archived.length}</span>
                </button>
                {showArchived && (
                  <ul className="mt-3 space-y-3 opacity-70">
                    {archived.map((r) => (
                      <Row key={r.id} relay={r} live={false} onOpen={(x) => setOpenId(x.id)} />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        </>
      )}

      <RelayDetailModal relay={opened} coreUrl={coreUrl} onClose={() => setOpenId(null)} />
      <CreateRelayWizard open={wizard} onClose={() => setWizard(false)} coreUrl={coreUrl} geo={geo} />
    </div>
  );
}
