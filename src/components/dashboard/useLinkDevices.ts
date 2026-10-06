"use client";

import { useCallback, useEffect, useState } from "react";
import type { PluginLatest } from "@/lib/plugin";
import { coreFetch } from "./coreClient";

// Postes OBS du compte (registre du Core, rafraîchi toutes les 5 s) + dernière version publiée du plugin.

export type LinkDevice = {
  id: string;
  name: string;
  platform: string;
  os: string;
  host: string;
  plugin_version: string;
  online: boolean;
  online_since: string | null;
  last_seen: string | null;
  created_at: string;
};

/** `demo` : données d'exemple (pages de démo des captures), aucun appel au Core. */
export type DevicesDemo = { devices: LinkDevice[]; latest: PluginLatest | null };

export function useLinkDevices(coreUrl: string, every = 5000, demo?: DevicesDemo) {
  const [devices, setDevices] = useState<LinkDevice[] | null>(demo?.devices ?? null);
  const [latest, setLatest] = useState<PluginLatest | null>(demo?.latest ?? null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (demo) return;
    const r = await coreFetch(coreUrl, "/v1/me/link/devices").catch(() => null);
    if (!r?.ok) return setError(r?.status === 403 ? "Cette fonction est réservée aux comptes invités." : "Impossible de charger tes postes pour le moment.");
    setError("");
    setDevices(((await r.json()) as { devices: LinkDevice[] }).devices);
  }, [coreUrl, demo]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => void load(), every);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load, every]);

  useEffect(() => {
    if (demo) return;
    let live = true;
    fetch(`${coreUrl}/v1/plugin/latest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && setLatest(j as PluginLatest | null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [coreUrl, demo]);

  const rename = useCallback(
    async (id: string, name: string) => {
      const r = await coreFetch(coreUrl, `/v1/me/link/devices/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => null);
      if (r?.ok) await load();
      return !!r?.ok;
    },
    [coreUrl, load],
  );

  const revoke = useCallback(
    async (id: string) => {
      const r = await coreFetch(coreUrl, `/v1/me/link/devices/${id}`, { method: "DELETE" }).catch(() => null);
      if (r?.ok) await load();
      return !!r?.ok;
    },
    [coreUrl, load],
  );

  return { devices, latest, error, reload: load, rename, revoke };
}
