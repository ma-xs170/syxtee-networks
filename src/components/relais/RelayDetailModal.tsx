"use client";

import { useEffect, useRef } from "react";
import StreamHealth from "@/components/dashboard/StreamHealth";
import StreamPreview from "@/components/dashboard/StreamPreview";
import { fmtAgo } from "@/lib/dashboard-data";
import type { RelayRow } from "@/lib/relay-groups";
import RelayActions from "./RelayActions";
import { ProtocolBadge, ServerLabel } from "./RelayList";
import RelayUrls from "./RelayUrls";

// Détail d'un relais en modale (comme un clic sur une caméra) : URLs, aperçu, santé du flux, actions. Pas de page dédiée.

export default function RelayDetailModal({ relay, coreUrl, onClose }: { relay: RelayRow | null; coreUrl: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (relay && !d.open) d.showModal();
    if (!relay && d.open) d.close();
  }, [relay]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      aria-labelledby="relay-detail-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(720px,calc(100vw-2rem))] rounded-2xl border border-line bg-background p-0 text-foreground backdrop:bg-background/80 backdrop:backdrop-blur-sm"
    >
      {relay && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="relay-detail-title" className="break-words text-xl font-semibold tracking-tight">
                {relay.name}
              </h2>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
                {relay.live && <span className="live-dot" aria-label="En live" />}
                <ProtocolBadge protocol={relay.protocol} />
                <ServerLabel id={relay.server} />
                <span>{relay.archived ? "Archivé" : relay.live ? "En live" : relay.last_live_at ? `Dernier live ${fmtAgo(relay.last_live_at)}` : "Jamais utilisé"}</span>
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-accent/10 hover:text-foreground">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="mt-5">
            <RelayActions relay={relay} showView={false} />
          </div>

          {relay.archived ? (
            <p className="mt-6 text-sm text-muted">Ce relais est archivé : ses URLs ne marchent plus. Réactive-le pour diffuser de nouveau (menu Plus).</p>
          ) : (
            <div className="mt-6 space-y-6">
              <section>
                <p className="mb-4 text-xs text-muted">Elles contiennent la clé de ce relais : ne les partage pas et ne les montre pas en live.</p>
                <RelayUrls relay={relay} />
              </section>
              <StreamPreview coreUrl={coreUrl} relayId={relay.id} />
              <StreamHealth coreUrl={coreUrl} relayId={relay.id} />
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
