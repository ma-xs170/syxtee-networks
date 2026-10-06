"use client";

import { useEffect, useMemo, useState } from "react";
import { RELAY_SERVERS, distanceKm, estimateRtt, flag } from "@/lib/relay-servers";
import RelayGlobe, { type GlobeServer } from "./RelayGlobe";

// Globe des serveurs de relais + liste à côté (alternative texte du globe). Le ping du serveur en ligne est mesuré en direct
// depuis le navigateur (GET /ping du Core, médiane de 5, toutes les 5 s). Les serveurs à venir : latence estimée si la position
// approximative du visiteur est connue, sinon « Bientôt ».

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function measure(coreUrl: string, signal: AbortSignal): Promise<number | null> {
  const times: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${coreUrl}/ping`, { cache: "no-store", signal });
      if (!res.ok) return null;
    } catch {
      return null;
    }
    times.push(performance.now() - t0);
  }
  return Math.round(median(times));
}

export default function RelayWorld({ coreUrl, geo = null, initial = "bhs1", onSelect }: { coreUrl: string; geo?: { lat: number; lon: number } | null; initial?: string; onSelect?: (id: string) => void }) {
  const [selected, setSelected] = useState(initial);
  const [ping, setPing] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (!coreUrl) return;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      const ms = await measure(coreUrl, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setPing((p) => ({ ...p, bhs1: ms }));
      timer = setTimeout(run, 5000);
    };
    void run();
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [coreUrl]);

  const servers: GlobeServer[] = useMemo(
    () =>
      RELAY_SERVERS.map((s) => {
        const measured = s.available ? ping[s.id] : undefined;
        const est = geo ? estimateRtt(distanceKm(geo, s)) : null;
        return { id: s.id, city: s.city, lat: s.lat, lon: s.lon, available: s.available, ping: measured ?? (s.available ? null : est), estimated: measured == null && est != null };
      }),
    [ping, geo],
  );

  const pick = (id: string) => {
    setSelected(id);
    onSelect?.(id);
  };

  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <RelayGlobe servers={servers} selected={selected} onSelect={pick} geo={geo} className="mx-auto max-w-[640px]" />
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {RELAY_SERVERS.map((s) => {
          const g = servers.find((x) => x.id === s.id)!;
          const on = s.id === selected;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => pick(s.id)}
                aria-pressed={on}
                className={`flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-foreground/[0.06] sm:px-5 ${on ? "bg-foreground/10" : ""}`}
              >
                <span className="text-lg" aria-hidden="true">
                  {flag(s.cc)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{s.city}</span>
                  <span className="block truncate text-xs text-muted">{s.country}</span>
                </span>
                {s.available ? (
                  <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em]">
                    <span className="live-dot" aria-hidden="true" />
                    <span className="tabular-nums">{g.ping != null ? `${g.ping} ms` : "En ligne"}</span>
                  </span>
                ) : (
                  <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">{s.maintenance ? "Maintenance" : g.ping != null ? `~${g.ping} ms · Bientôt` : "Bientôt"}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
