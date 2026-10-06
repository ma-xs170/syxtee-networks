"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmtClock } from "@/lib/dashboard-data";
import { coreFetch } from "./coreClient";

// Tableau léger des relais : texte seul, un petit JSON du Core à intervalle choisi (5, 15 ou 30 s), à l'arrêt quand
// l'onglet est caché. Le compteur affiche ce que la page a réellement consommé depuis son ouverture.

type Row = {
  id: string; name: string; live: boolean; kbps: number | null; net_kbps: number | null; rtt: number | null;
  latency: number | null; buffer: number | null; links: number | null; lost_1m: number | null; since: number | null;
};
type Lite = { t: number; relays: Row[] };

const nf = new Intl.NumberFormat("fr-FR");
const dash = "-";
const num = (v: number | null, unit: string) => (v === null ? dash : `${nf.format(v)} ${unit}`);
const INTERVALS = [5, 15, 30] as const;

function fmtBytes(n: number) {
  return n < 1024 ? `${n} o` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1).replace(".", ",")} Ko` : `${(n / 1048576).toFixed(2).replace(".", ",")} Mo`;
}

export default function LowDataBoard({ coreUrl }: { coreUrl: string }) {
  const [data, setData] = useState<Lite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [every, setEvery] = useState<(typeof INTERVALS)[number]>(15);
  const [paused, setPaused] = useState(false);
  const [bytes, setBytes] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current || !coreUrl) return;
    busy.current = true;
    try {
      const res = await coreFetch(coreUrl, "/v1/me/status/lite");
      if (res.status === 404) throw new Error("Le serveur relais n'est pas encore à jour pour ce mode.");
      if (!res.ok) throw new Error(`Le relais ne répond pas (${res.status}).`);
      const text = await res.text();
      setBytes((b) => b + text.length + 400); // corps + en-têtes (estimation)
      setData(JSON.parse(text) as Lite);
      setError(null);
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Relais injoignable.");
    } finally {
      busy.current = false;
    }
  }, [coreUrl]);

  useEffect(() => {
    if (paused) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      load();
      timer = setInterval(load, every * 1000);
    };
    const onVisibility = () => {
      clearInterval(timer);
      if (document.visibilityState === "visible") start();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [every, paused, load]);

  const live = data?.relays.filter((r) => r.live) ?? [];
  const offline = data?.relays.filter((r) => !r.live) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Mise à jour</span>
        {INTERVALS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={every === s}
            onClick={() => setEvery(s)}
            className={`h-9 rounded-full border px-3 font-mono text-xs ${every === s ? "border-accent bg-accent text-on-accent" : "border-line text-muted"}`}
          >
            {s} s
          </button>
        ))}
        <button type="button" onClick={() => setPaused((p) => !p)} className="h-9 rounded-full border border-line px-3 text-xs text-muted">
          {paused ? "Reprendre" : "Pause"}
        </button>
        <button type="button" onClick={load} className="h-9 rounded-full border border-line px-3 text-xs text-muted">
          Actualiser
        </button>
      </div>
      <p className="mt-2 font-mono text-xs text-muted" aria-live="off">
        Consommé par cette page : {fmtBytes(bytes)}
        {data ? ` · dernière mise à jour ${new Date(data.t).toLocaleTimeString("fr-FR")}` : ""}
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-line px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}
      {!data && !error && <p className="mt-6 text-sm text-muted">Chargement...</p>}
      {data && data.relays.length === 0 && <p className="mt-6 text-sm text-muted">Aucun relais actif sur ce compte.</p>}

      <section aria-label="Relais en direct" className="mt-6">
        <h2 className="text-sm font-semibold">En direct ({live.length})</h2>
        {live.length === 0 && data && <p className="mt-2 text-sm text-muted">Aucun relais en direct pour le moment.</p>}
        <ul className="mt-3 space-y-3">
          {live.map((r) => (
            <li key={r.id} className="rounded-xl border border-line-strong p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-medium">{r.name}</p>
                {r.since && <p className="shrink-0 font-mono text-xs tabular-nums text-muted">{fmtClock((now - r.since) / 1000)}</p>}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-sm tabular-nums">
                <Item k="Débit reçu" v={num(r.kbps, "kbps")} />
                <Item k="Débit réseau" v={num(r.net_kbps, "kbps")} />
                <Item k="Latence (RTT)" v={num(r.rtt, "ms")} />
                <Item k="Latence SRT" v={num(r.latency, "ms")} />
                <Item k="Tampon" v={num(r.buffer, "ms")} />
                <Item k="Liens" v={r.links === null ? dash : nf.format(r.links)} />
                <Item k="Perdus / min" v={r.lost_1m === null ? dash : nf.format(r.lost_1m)} />
              </dl>
            </li>
          ))}
        </ul>
      </section>

      {offline.length > 0 && (
        <section aria-label="Relais hors ligne" className="mt-6">
          <h2 className="text-sm font-semibold">Hors ligne ({offline.length})</h2>
          <ul className="mt-2 divide-y divide-line text-sm text-muted">
            {offline.map((r) => (
              <li key={r.id} className="truncate py-2">
                {r.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-sans text-xs text-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
