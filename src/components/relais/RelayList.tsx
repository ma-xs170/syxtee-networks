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
import RelayUrls from "./RelayUrls";
import Link from "next/link";

// Page « Mes connexions » : compteur, bouton de création, filtres, et serveurs classés automatiquement : en direct (pastille rouge) tout en haut, actifs au milieu, inactifs puis archivés en bas.

type Props = {
  relays: RelayRow[];
  active: number;
  max: number;
  coreUrl: string;
  geo: { lat: number; lon: number } | null;
  /** Ouvre l'assistant au chargement (lien « Créer mon relais » de l'accueil : /dashboard/serveurs?nouveau=1). */
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

const STATE: Record<RelayGroup, { label: string; dot: string; text: string }> = {
  live: { label: "En direct", dot: "bg-live", text: "text-live" },
  active: { label: "Actif", dot: "bg-ok", text: "text-foreground" },
  idle: { label: "Inactif", dot: "bg-foreground/25", text: "text-muted" },
  archived: { label: "Archivé", dot: "bg-foreground/15", text: "text-muted" },
};

const icon = "grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/10 hover:text-foreground";
const ask = (id: string, action: string) => window.dispatchEvent(new CustomEvent("relay-action", { detail: { id, action } }));

/** Ligne dépliable : un clic sur le nom ouvre « Se connecter » (QR, URL), crayon pour renommer, corbeille pour supprimer (avec confirmation). */
function Row({ relay, open, onToggle }: { relay: RelayRow; open: boolean; onToggle: () => void }) {
  const g = relayGroup(relay);
  const st = STATE[g];
  const panel = `panel-${relay.id}`;
  return (
    <li>
      <div className="flex items-center gap-1 px-3 py-2.5 transition-colors hover:bg-foreground/[0.04] sm:px-4">
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panel} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30">
          {g === "live" ? <span className="live-dot shrink-0" aria-label="En direct" /> : <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${st.dot}`} />}
          <span className="min-w-0 truncate text-[15px] font-medium">{relay.name}</span>
          <span className="hidden shrink-0 sm:inline-flex"><ProtocolBadge protocol={relay.protocol} /></span>
          <span className={`hidden shrink-0 text-xs md:inline ${st.text}`}>{st.label}</span>
          <span className="ml-auto hidden shrink-0 text-sm text-muted lg:inline">
            {g === "live" ? "En ce moment" : relay.last_live_at ? fmtAgo(relay.last_live_at) : "Jamais utilisé"}
            {relay.avg_kbps != null && <span className="ml-3 font-mono tabular-nums">{fmtInt(relay.avg_kbps)} kbps</span>}
          </span>
        </button>
        <button type="button" onClick={() => ask(relay.id, "rename")} className={icon} aria-label={`Renommer ${relay.name}`} title="Renommer">
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>
        </button>
        <button type="button" onClick={() => ask(relay.id, "delete")} className={`${icon} hover:!text-red-300`} aria-label={`Supprimer ${relay.name}`} title="Supprimer">
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
        </button>
        <button type="button" onClick={onToggle} tabIndex={-1} aria-hidden="true" className={icon}>
          <svg viewBox="0 0 24 24" className={`size-[18px] transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
      {open && (
        <div id={panel} className="border-t border-line bg-background/40 px-4 py-6 sm:px-6">
          {relay.archived ? (
            <p className="text-sm text-muted">Cette connexion est archivée : ses adresses ne marchent plus. Réactive-la depuis sa fiche.</p>
          ) : (
            <RelayUrls relay={relay} />
          )}
          <Link href={`/dashboard/serveurs/${relay.id}`} aria-label={`Détails de ${relay.name}`} className="mt-6 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground">
            Détails, statistiques et réglages <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
      <RelayActions relay={relay} bare />
    </li>
  );
}

export default function RelayList({ relays, active, max, coreUrl, geo, autoOpen = false }: Props) {
  const [wizard, setWizard] = useState(autoOpen && active < max);
  const [server, setServer] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const { state } = useLiveStatus();

  // Statut en direct : le flux SSE du Core prime sur l'état lu au chargement de la page.
  const liveIds = useMemo(() => {
    if (!state?.relays) return null;
    return new Set(state.relays.filter((r) => r.live || r.reconnecting).map((r) => r.id));
  }, [state]);
  const withLive = relays.map((r) => ({ ...r, live: !r.archived && (liveIds ? liveIds.has(r.id) : r.live) }));

  const servers = [...new Set(relays.map((r) => r.server))];
  const shown = withLive.filter(
    (r) => server === "all" || r.server === server,
  );
  const ORDER: Record<RelayGroup, number> = { live: 0, active: 1, idle: 2, archived: 3 };
  const rows = [...shown].sort((a, b) => ORDER[relayGroup(a)] - ORDER[relayGroup(b)]);
  const full = active >= max;
  const unlimited = max >= 1_000_000;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-page">
            Mes <em>connexions</em>
          </h1>
          <p className="mt-2 font-mono text-sm tabular-nums text-muted">
            {active} / {unlimited ? "∞" : max} connexions
          </p>
        </div>
      </div>

      {relays.length === 0 ? (
        <section className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-dashed border-line p-8 md:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Aucune connexion pour l&apos;instant</h2>
            <p className="mt-2 max-w-[55ch] text-sm leading-relaxed text-muted">
              Une connexion reçoit le flux de ton téléphone ou de ta caméra, et le renvoie à OBS. Crées-en une par appareil.
            </p>
            {!full && (
              <button
                type="button"
                onClick={() => setWizard(true)}
                className="mt-6 h-11 whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium transition-colors active:scale-[0.98]"
              >
                Créer ma première connexion
              </button>
            )}
          </div>
          <div className="mx-auto h-52 w-full max-w-[220px]">
            <RelayServer animated={false} className="h-full w-full" />
          </div>
        </section>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-start gap-3">
            <div className="flex flex-wrap items-center gap-2">
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
        {full ? (
          <a href="https://discord.gg/CD68F8yZuZ" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center whitespace-nowrap rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-foreground/10">
            Limite atteinte · Demander plus de connexions
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setWizard(true)}
            className="h-10 whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium transition-colors active:scale-[0.98]"
          >
            + Créer une connexion
          </button>
        )}
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">Aucune connexion ne correspond.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {rows.map((r) => (
                <Row key={r.id} relay={r} open={openId === r.id} onToggle={() => setOpenId((v) => (v === r.id ? null : r.id))} />
              ))}
            </ul>
          )}
        </>
      )}

      <CreateRelayWizard open={wizard} onClose={() => setWizard(false)} coreUrl={coreUrl} geo={geo} active={active} max={max} />
    </div>
  );
}
