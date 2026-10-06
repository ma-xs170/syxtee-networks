"use client";

import { useEffect, useState } from "react";
import { fmtInt } from "@/lib/dashboard-data";
import { Sparkline } from "./charts";
import { coreFetch } from "./coreClient";
import { useLiveStatus } from "./LiveStatus";
import { ArrowLink, Tile, TileLabel } from "./ui";

// Santé du flux en mini (vue d'ensemble) : 4 valeurs + courbe 15 min, relues toutes les 10 s pendant un direct.

type Sample = { t: number; bitrate: number; rtt: number; dropped: number; congestion: number };

export default function MiniHealth() {
  const { state, coreUrl } = useLiveStatus();
  const live = !!state?.live;
  const relayId = state?.relay_id;
  const [samples, setSamples] = useState<Sample[]>([]);

  useEffect(() => {
    if (!live || !coreUrl || !relayId) return;
    let stopped = false;
    const load = async () => {
      try {
        const res = await coreFetch(coreUrl, `/v1/me/relays/${relayId}/health?range=15m`);
        if (res.ok && !stopped) setSamples(((await res.json()) as { samples: Sample[] }).samples);
      } catch {
        // Relais injoignable : on garde les dernières valeurs.
      }
    };
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 10_000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [live, coreUrl, relayId]);

  const last = live ? samples[samples.length - 1] : undefined;
  const lost = live ? samples.filter((s) => last && s.t > last.t - 60_000).reduce((a, s) => a + s.dropped, 0) : 0;
  const values: [string, string][] = [
    ["Débit", last ? `${fmtInt(state?.kbps ?? last.bitrate)} kbps` : "-"],
    ["RTT", last ? `${fmtInt(last.rtt)} ms` : "-"],
    ["Congestion", last ? `${fmtInt(last.congestion * 100)} %` : "-"],
    ["Perdus/min", last ? fmtInt(lost) : "-"],
  ];

  return (
    <Tile aria-labelledby="sante-mini">
      <TileLabel id="sante-mini" right={<ArrowLink href="/dashboard/sante">Détail</ArrowLink>}>
        Santé du flux
      </TileLabel>
      {live ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            {values.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="mt-0.5 font-mono text-sm tabular-nums text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <Sparkline points={samples.map((s) => s.bitrate)} className="mt-4 h-12 w-full" label="Débit des 15 dernières minutes" />
          <p className="mt-1 flex justify-between font-mono text-[10px] text-muted" aria-hidden="true">
            <span>−15 min</span>
            <span>maintenant</span>
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">Hors ligne. Les mesures apparaissent dès que ton flux arrive au relais.</p>
      )}
    </Tile>
  );
}
