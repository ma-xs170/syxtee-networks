"use client";

import { useEffect, useState } from "react";
import { coreFetch, sleep } from "@/components/dashboard/coreClient";

// Connexions actives d'un serveur SRTLA : une barre par lien (Wi-Fi, 4G/5G…) du téléphone, en direct (Server-Sent Events du Core).
// La couleur dit la santé du lien : vert correct, orange faible, rouge très bas ou coupé.

type Peer = { connection_id: string; bitrate: number };
type Live = { live: boolean; peers?: Peer[]; sample: { bitrate: number } | null };

/** Seuils en kb/s : en dessous de BAD le lien ne porte presque rien, en dessous de WARN il est faible. */
const BAD = 300;
const WARN = 1000;
/** Échelle des barres : au moins 4 Mb/s pour que « un lien à 1 Mb/s » reste visiblement à moitié vide. */
const MIN_SCALE = 4000;

const nf = new Intl.NumberFormat("fr-FR");
const mbps = (kbps: number) => (kbps >= 1000 ? `${(kbps / 1000).toFixed(1).replace(".", ",")} Mb/s` : `${nf.format(Math.round(kbps))} kb/s`);

function level(kbps: number) {
  if (kbps < BAD) return { bar: "bg-bad", text: "text-bad", label: kbps <= 0 ? "Coupé" : "Très bas" };
  if (kbps < WARN) return { bar: "bg-warn", text: "text-warn", label: "Faible" };
  return { bar: "bg-ok", text: "text-ok", label: "Bon" };
}

export default function RelayConnections({ coreUrl, relayId }: { coreUrl: string; relayId: string }) {
  const [live, setLive] = useState<Live | null>(null);
  const [link, setLink] = useState<"connecting" | "ok" | "error">("connecting");

  useEffect(() => {
    let stopped = false;
    const ctrl = new AbortController();
    (async () => {
      let delay = 1000;
      while (!stopped) {
        try {
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
              if (data) setLive(JSON.parse(data.slice(6)) as Live);
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
  }, [coreUrl, relayId]);

  const peers = live?.live ? (live.peers ?? []) : [];
  const scale = Math.max(MIN_SCALE, ...peers.map((p) => p.bitrate));
  const total = peers.reduce((a, p) => a + p.bitrate, 0);
  const tl = level(total);

  return (
    <section aria-labelledby="connexions" className="space-y-5">
      <div className="flex items-center gap-3">
        <h2 id="connexions" className="text-sm font-semibold">Connexions actives</h2>
        <p className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
          {link === "error" ? "Serveur injoignable, reconnexion…" : live?.live ? <><span className="live-dot" /> <span className="text-foreground">En direct</span></> : link === "connecting" ? "Connexion…" : "Hors ligne"}
        </p>
      </div>

      {peers.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface px-5 py-10 text-center text-sm text-muted">
          {live?.live ? "Aucun détail par connexion pour ce flux." : "Aucune connexion : lance le direct depuis le téléphone pour voir chaque lien."}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-medium">{peers.length} connexion{peers.length > 1 ? "s" : ""}</p>
            <p className="font-mono text-xs text-muted">
              Total <span className={`tabular-nums ${tl.text}`}>{mbps(total)}</span>
            </p>
          </div>
          <ul className="mt-5 space-y-5">
            {peers.map((p, i) => {
              const l = level(p.bitrate);
              return (
                <li key={p.connection_id}>
                  <div className="mb-2 flex items-baseline justify-between gap-3 font-mono text-xs">
                    <span className="text-muted">Connexion {i + 1}</span>
                    <span className="flex items-baseline gap-3">
                      <span className={l.text}>{l.label}</span>
                      <span className="w-24 text-right tabular-nums text-foreground">{mbps(p.bitrate)}</span>
                    </span>
                  </div>
                  <div role="meter" aria-label={`Connexion ${i + 1}`} aria-valuemin={0} aria-valuemax={scale} aria-valuenow={Math.round(p.bitrate)} aria-valuetext={`${mbps(p.bitrate)}, ${l.label}`} className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
                    <div className={`h-full rounded-full transition-[width,background-color] duration-500 motion-reduce:transition-none ${l.bar}`} style={{ width: `${Math.min(100, (p.bitrate / scale) * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-4 font-mono text-[10px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-ok" />≥ {mbps(WARN)}</span>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-warn" />{mbps(BAD)} à {mbps(WARN)}</span>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-bad" />&lt; {mbps(BAD)}</span>
          </p>
        </div>
      )}
    </section>
  );
}
