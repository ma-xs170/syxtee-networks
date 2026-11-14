"use client";

import { useEffect, useState } from "react";
import { coreFetch } from "@/components/dashboard/coreClient";
import type { Relay } from "./shared";

/** Relevé en direct de tous les relais du compte (toutes les 2 s, en pause quand l'onglet est caché). */
export function useControl(coreUrl: string) {
  const [relays, setRelays] = useState<Relay[] | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let stop = false;
    const ctrl = new AbortController();
    async function tick() {
      if (document.hidden) return;
      try {
        const res = await coreFetch(coreUrl, "/v1/me/control", { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as { relays: Relay[] };
        if (!stop) {
          setRelays(j.relays);
          setError(false);
          setNow(Date.now());
        }
      } catch {
        if (!stop && !ctrl.signal.aborted) setError(true);
      }
    }
    void tick();
    const id = setInterval(tick, 2000);
    return () => {
      stop = true;
      ctrl.abort();
      clearInterval(id);
    };
  }, [coreUrl]);

  return { relays, error, now };
}
