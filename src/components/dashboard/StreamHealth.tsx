"use client";

import { useEffect, useState } from "react";
import { coreFetch, sleep } from "./coreClient";

// Santé du flux en direct (Server-Sent Events du Core) : débit, RTT, congestion, pertes, liens SRTLA,
// et courbe de débit sur les 15 dernières minutes. Se reconnecte seul si le Core ou le réseau décroche.

export type Sample = { t: number; bitrate: number; rtt: number; dropped: number; congestion: number; links: number };
type Peer = { connection_id: string; bitrate: number };
export type Live = { live: boolean; since: number; sample: Sample | null; peers?: Peer[] };

const WINDOW = 15 * 60_000;
const nf = new Intl.NumberFormat("fr-FR");

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-background px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg tabular-nums text-foreground">
        {value} <span className="text-xs text-muted">{unit}</span>
      </p>
    </div>
  );
}

function Curve({ samples }: { samples: Sample[] }) {
  if (samples.length < 2) return <div className="h-16" />;
  const t1 = samples[samples.length - 1].t;
  const t0 = t1 - WINDOW;
  const max = Math.max(1000, ...samples.map((s) => s.bitrate)) * 1.1;
  const d = samples
    .map((s, i) => `${i ? "L" : "M"}${(((s.t - t0) / WINDOW) * 100).toFixed(2)} ${(36 - (s.bitrate / max) * 32).toFixed(2)}`)
    .join("");
  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="h-16 w-full text-foreground" aria-hidden="true">
      <path d="M0 4H100M0 35H100" stroke="currentColor" strokeOpacity={0.12} strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export type HealthDemo = { live: Live; history: Sample[] };

/** `demo` : données fixes (pages de démo des captures du site), sans connexion au Core. */
export default function StreamHealth({ coreUrl, relayId, demo }: { coreUrl: string; relayId: string; demo?: HealthDemo }) {
  const [live, setLive] = useState<Live | null>(demo?.live ?? null);
  const [history, setHistory] = useState<Sample[]>(demo?.history ?? []);
  const [link, setLink] = useState<"connecting" | "ok" | "error">(demo ? "ok" : "connecting");

  useEffect(() => {
    if (demo) return;
    let stopped = false;
    const ctrl = new AbortController();
    (async () => {
      let delay = 1000;
      while (!stopped) {
        try {
          const h = await coreFetch(coreUrl, `/v1/me/relays/${relayId}/health?range=15m`, { signal: ctrl.signal });
          if (h.ok) setHistory(((await h.json()) as { samples: Sample[] }).samples);
          const res = await coreFetch(coreUrl, `/v1/me/relays/${relayId}/health/stream`, { signal: ctrl.signal });
          if (!res.ok || !res.body) throw new Error(String(res.status));
          setLink("ok");
          delay = 1000;
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let i;
            while ((i = buf.indexOf("\n\n")) >= 0) {
              const block = buf.slice(0, i);
              buf = buf.slice(i + 2);
              const data = block.split("\n").find((l) => l.startsWith("data: "));
              if (!data) continue;
              const s = JSON.parse(data.slice(6)) as Live;
              setLive(s);
              const sample = s.sample;
              if (s.live && sample) setHistory((prev) => [...prev.filter((p) => p.t > sample.t - WINDOW && p.t < sample.t), sample]);
            }
          }
          throw new Error("fermé");
        } catch {
          if (stopped) return;
          setLink("error");
          await sleep(delay);
          delay = Math.min(delay * 2, 30_000);
        }
      }
    })();
    return () => {
      stopped = true;
      ctrl.abort();
    };
  }, [coreUrl, relayId, demo]);

  const s = live?.live ? live.sample : null;
  const now = s?.t ?? Date.now();
  const lostMinute = history.filter((h) => h.t > now - 60_000).reduce((a, h) => a + h.dropped, 0);
  const peers = live?.live ? (live.peers ?? []) : [];
  const peerMax = Math.max(1, ...peers.map((p) => p.bitrate));

  return (
    <section className="rounded-2xl border border-line p-5 sm:p-6" aria-labelledby="sante">
      <div className="flex items-center justify-between gap-4">
        <h2 id="sante" className="text-sm font-semibold">
          Santé du flux
        </h2>
        <p className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
          {link === "error" ? (
            "Relais injoignable, reconnexion…"
          ) : live?.live ? (
            <>
              <span className="live-dot" /> <span className="text-foreground">En live</span>
            </>
          ) : link === "connecting" ? (
            "Connexion…"
          ) : (
            "Hors ligne"
          )}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        <Metric label="Débit reçu" value={s ? nf.format(Math.round(s.bitrate)) : "–"} unit="kbps" />
        <Metric label="RTT" value={s ? nf.format(Math.round(s.rtt)) : "–"} unit="ms" />
        <Metric label="Congestion" value={s ? nf.format(Math.round(s.congestion * 100)) : "–"} unit="%" />
        <Metric label="Perdus/min" value={s ? nf.format(lostMinute) : "–"} unit="paquets" />
      </div>

      <div className="mt-4">
        <Curve samples={history} />
        <p className="mt-1 flex justify-between font-mono text-[10px] text-muted">
          <span>−15 min</span>
          <span>maintenant</span>
        </p>
      </div>

      {peers.length > 0 && (
        <div className="mt-5">
          <p className="text-xs text-muted">Liens SRTLA · {peers.length}</p>
          <ul className="mt-2 space-y-2">
            {peers.map((p, i) => (
              <li key={p.connection_id} className="flex items-center gap-3 font-mono text-xs">
                <span className="w-14 text-muted">Lien {i + 1}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/20">
                  <span className="block h-full rounded-full bg-foreground/20" style={{ width: `${(p.bitrate / peerMax) * 100}%` }} />
                </span>
                <span className="w-24 text-right tabular-nums text-foreground">{nf.format(p.bitrate)} kbps</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
