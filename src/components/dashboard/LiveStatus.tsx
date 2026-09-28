"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fmtClock } from "@/lib/dashboard-data";
import { coreFetch, readSse, sleep } from "./coreClient";

// Statut du flux en temps réel (SSE du Core, /v1/me/status/stream), partagé par la barre et les pages du dashboard :
// une seule connexion par onglet, reconnexion automatique.

export type RelayLive = { id: string; name: string; live: boolean; reconnecting: boolean; started_at: number | null; kbps: number | null; reconnects: number };
/** Champs de premier niveau : relais principal (le premier en direct, sinon en reconnexion). `relays` : tous les relais actifs. */
export type LiveState = Omit<RelayLive, "id" | "name"> & { relay_id?: string | null; relays?: RelayLive[] };
type Ctx = { state: LiveState | null; link: "off" | "connecting" | "ok" | "error"; coreUrl: string };

const LiveContext = createContext<Ctx>({ state: null, link: "off", coreUrl: "" });
export const useLiveStatus = () => useContext(LiveContext);

export function LiveStatusProvider({ coreUrl, children }: { coreUrl: string; children: ReactNode }) {
  const [ctx, setCtx] = useState<Ctx>({ state: null, link: coreUrl ? "connecting" : "off", coreUrl });

  useEffect(() => {
    if (!coreUrl) return;
    let stopped = false;
    const ctrl = new AbortController();
    (async () => {
      let delay = 1000;
      while (!stopped) {
        try {
          const res = await coreFetch(coreUrl, "/v1/me/status/stream", { signal: ctrl.signal });
          if (!res.ok) throw new Error(String(res.status));
          delay = 1000;
          await readSse<LiveState>(res, (state) => setCtx({ state, link: "ok", coreUrl }));
          throw new Error("fermé");
        } catch {
          if (stopped) return;
          setCtx((c) => ({ ...c, link: "error" }));
          await sleep(delay);
          delay = Math.min(delay * 2, 30_000);
        }
      }
    })();
    return () => {
      stopped = true;
      ctrl.abort();
    };
  }, [coreUrl]);

  return <LiveContext.Provider value={ctx}>{children}</LiveContext.Provider>;
}

/** Heure courante, rafraîchie chaque seconde tant que `active`. */
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Chronomètre du direct en cours (« 00:12:34 »), ou null hors ligne. */
export function useLiveClock() {
  const { state } = useLiveStatus();
  const on = !!(state?.live || state?.reconnecting) && !!state?.started_at;
  const now = useNow(on);
  return on ? fmtClock((now - state!.started_at!) / 1000) : null;
}

/** Pastille de la barre : « ● EN LIVE 00:12:34 » ou « Hors ligne ». */
export function LivePill({ compact = false }: { compact?: boolean }) {
  const { state, link } = useLiveStatus();
  const clock = useLiveClock();
  const live = !!state?.live;
  const label = live ? "En live" : state?.reconnecting ? "Reconnexion" : link === "error" ? "Relais injoignable" : "Hors ligne";
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border px-3 font-mono text-[11px] uppercase tracking-[0.12em] ${
        live || state?.reconnecting ? "border-live/40 text-foreground" : "border-line text-muted"
      }`}
    >
      {live || state?.reconnecting ? <span className="live-dot" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full border border-muted" aria-hidden="true" />}
      <span className={compact && (live || state?.reconnecting) ? "sr-only" : ""}>{label}</span>
      {clock && <span className="tabular-nums">{clock}</span>}
    </span>
  );
}
