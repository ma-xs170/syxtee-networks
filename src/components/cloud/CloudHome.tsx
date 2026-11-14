"use client";

import Link from "next/link";
import StreamPreview from "@/components/dashboard/StreamPreview";
import { useMemo, useState } from "react";
import { efficiency, fmtKbps, quality, qualityLevel } from "@/lib/control-center";
import { formatOf, LEVEL, StereoMeter, type Relay } from "./shared";
import Thumb from "./Thumb";
import { useControl } from "./useControl";

// Cloud : logiciel pleine page. Les flux à gauche, leurs aperçus en direct à droite (une vignette par flux),
// avec vumètre, débit et qualité en surimpression. « Contrôler » ouvre la page du flux.

function Card({ r, coreUrl, picked }: { r: Relay; coreUrl: string; picked: boolean }) {
  const q = r.live ? quality(r.sample, r.lost_1m, r.peers) : null;
  const lv = LEVEL[qualityLevel(q)];
  return (
    <li id={`flux-${r.id}`} className={`overflow-hidden rounded-lg border bg-surface transition-colors ${picked ? "border-foreground/60" : "border-line"}`}>
      <div className="relative aspect-video bg-background">
        <Thumb coreUrl={coreUrl} relayId={r.id} live={r.live} alt={`Aperçu de ${r.name}`} />
        {r.live && <StreamPreview coreUrl={coreUrl} relayId={r.id} compact />}
        {r.live ? (
          <>
            <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-bad" aria-hidden="true" />
              Direct
            </span>
            <StereoMeter audio={r.media?.audio} onVideo className="absolute bottom-2 left-2 top-9" />
            <dl className="absolute bottom-2 right-2 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 rounded bg-black/70 px-2 py-1.5 font-mono text-[10px] leading-4 text-white">
              <dt className="text-white/70">Format</dt>
              <dd className="text-right tabular-nums">{formatOf(r.media)}</dd>
              <dt className="text-white/70">Débit</dt>
              <dd className="text-right tabular-nums">{r.sample ? fmtKbps(r.sample.bitrate) : "—"}</dd>
              <dt className="text-white/70">Qualité</dt>
              <dd className="flex items-center justify-end gap-1 text-right tabular-nums">
                <span className={`h-1.5 w-1.5 rounded-full ${lv.dot}`} aria-hidden="true" />
                {q != null ? `${q} %` : "—"}
              </dd>
            </dl>
          </>
        ) : (
          <p className="absolute inset-0 grid place-items-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Hors ligne</p>
        )}
      </div>
      <div className="flex items-center gap-3 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{r.name}</p>
          <p className="truncate font-mono text-[11px] text-muted">{r.protocol.toUpperCase()}{r.live && r.peers.length > 0 ? ` · ${r.peers.length} modem${r.peers.length > 1 ? "s" : ""}` : ""}</p>
        </div>
        <Link href={`/dashboard/cloud/${r.id}`} className="shrink-0 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-on-accent transition-opacity hover:opacity-90">
          Contrôler
        </Link>
      </div>
    </li>
  );
}

export default function CloudHome({ coreUrl }: { coreUrl: string }) {
  const { relays, error } = useControl(coreUrl);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (relays ?? []).filter((r) => !term || r.name.toLowerCase().includes(term));
  }, [relays, q]);
  const liveCount = relays?.filter((r) => r.live).length ?? 0;

  if (!relays) {
    return error ? (
      <p role="alert" className="m-4 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">Le Core ne répond pas. Réessaie dans un instant.</p>
    ) : (
      <div aria-hidden="true" className="m-4 h-96 flex-1 animate-pulse rounded-lg bg-foreground/[0.04] motion-reduce:animate-none" />
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
      <aside aria-label="Flux" className="flex max-h-72 shrink-0 flex-col border-b border-line bg-surface lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
        <div className="space-y-2 border-b border-line p-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted">Flux</h2>
            <span className="font-mono text-[11px] text-muted">{liveCount} / {relays.length} en direct</span>
          </div>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un flux" aria-label="Rechercher un flux" className="h-9 w-full rounded-md border border-line bg-background px-3 text-sm placeholder:text-muted focus-visible:border-foreground/40 focus-visible:outline-none" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {[
            { title: "En direct", items: shown.filter((r) => r.live) },
            { title: "Hors ligne", items: shown.filter((r) => !r.live) },
          ].map((g) =>
            g.items.length === 0 ? null : (
              <section key={g.title} aria-label={g.title} className="border-b border-line">
                <h3 className="border-b border-line px-3 py-2 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted">{g.title}</h3>
                <ul className="divide-y divide-line">
                  {g.items.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPicked(r.id);
                          document.getElementById(`flux-${r.id}`)?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                        }}
                        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${picked === r.id ? "bg-foreground/[0.07]" : "hover:bg-foreground/[0.04]"}`}
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-[2px] ${r.live ? "bg-bad" : "bg-muted/50"}`} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.name}</span>
                          <span className="block truncate font-mono text-[11px] tabular-nums text-muted">{r.live && r.sample ? `${fmtKbps(r.sample.bitrate)}${efficiency(r.peers) != null ? ` · ${efficiency(r.peers)} %` : ""}` : "Hors ligne"}</span>
                        </span>
                        <span className="font-mono text-[10px] uppercase text-muted">{r.protocol}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
          {shown.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Aucun flux.</p>}
        </div>
      </aside>

      <section aria-label="Aperçus en direct" className="min-w-0 flex-1 p-4">
        {relays.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-muted">Aucune connexion pour l&apos;instant. Crée-en une dans l&apos;onglet Connexions.</p>
        ) : (
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,19rem),1fr))]">
            {shown.map((r) => <Card key={r.id} r={r} coreUrl={coreUrl} picked={picked === r.id} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
