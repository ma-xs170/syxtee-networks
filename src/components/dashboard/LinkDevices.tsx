"use client";

import { useCallback, useEffect, useState } from "react";
import { coreFetch } from "./coreClient";

// Paramètres, Appareils : les postes OBS reliés au compte (SYXTEE Link), leur état, le renommage, la révocation, le journal des actions.

type Device = { id: string; name: string; platform: string; os: string; host: string; plugin_version: string; online: boolean; online_since: string | null; last_seen: string | null; created_at: string };
type Entry = { id: number; device_id: string | null; method: string; ok: boolean; error: string | null; detail: string | null; created_at: string };

const OS: Record<string, string> = { darwin: "macOS", win32: "Windows", linux: "Linux" };
const btn = "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-line px-4 text-xs font-medium transition-colors hover:bg-foreground/10 disabled:opacity-40";

/** « il y a 3 min » : durée écoulée depuis une date. */
function ago(iso: string | null, now: number) {
  if (!iso) return "jamais";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export default function LinkDevices({ coreUrl }: { coreUrl: string }) {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [audit, setAudit] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [d, a] = await Promise.all([coreFetch(coreUrl, "/v1/me/link/devices").catch(() => null), coreFetch(coreUrl, "/v1/me/link/audit?limit=15").catch(() => null)]);
    if (!d?.ok) return setError(d?.status === 403 ? "Les appareils sont réservés aux comptes invités." : "Impossible de charger tes appareils.");
    setError("");
    setDevices((await d.json()).devices);
    if (a?.ok) setAudit((await a.json()).entries);
    setNow(Date.now());
  }, [coreUrl]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => void load(), 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  async function rename() {
    if (!renaming) return;
    setBusy(true);
    const r = await coreFetch(coreUrl, `/v1/me/link/devices/${renaming.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: renaming.name }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      setRenaming(null);
      await load();
    } else setError("Renommage impossible.");
  }

  async function revoke(id: string) {
    setBusy(true);
    const r = await coreFetch(coreUrl, `/v1/me/link/devices/${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setConfirm("");
    if (r?.ok) await load();
    else setError("Révocation impossible.");
  }

  const nameOf = (id: string | null) => devices?.find((d) => d.id === id)?.name ?? "Poste révoqué";

  if (error && !devices) return <p className="mt-4 text-sm text-muted">{error}</p>;
  if (!devices) return <p className="mt-4 text-sm text-muted">Chargement…</p>;

  return (
    <div className="mt-4 grid gap-6">
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {devices.length === 0 ? (
        <p className="text-sm text-muted">Aucun poste relié. Installe SYXTEE Link sur l&apos;ordinateur d&apos;OBS, puis connecte-le à ton compte.</p>
      ) : (
        <ul className="grid gap-3">
          {devices.map((d) => (
            <li key={d.id} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {renaming?.id === d.id ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void rename();
                      }}
                    >
                      <input
                        value={renaming.name}
                        onChange={(e) => setRenaming({ id: d.id, name: e.target.value.slice(0, 40) })}
                        aria-label="Nom du poste"
                        className="h-9 rounded-lg border border-line bg-background px-3 text-sm"
                        autoFocus
                      />
                      <button type="submit" disabled={busy || !renaming.name.trim()} className={btn}>
                        Enregistrer
                      </button>
                    </form>
                  ) : (
                    <p className="truncate text-sm font-medium">{d.name}</p>
                  )}
                  <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${d.online ? "text-foreground" : "text-muted"}`}>
                    <span aria-hidden className={`size-2 rounded-full ${d.online ? "bg-foreground" : "border border-muted"}`} />
                    {d.online ? "En ligne" : "Hors ligne"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted">
                  {[OS[d.platform] ?? d.platform, d.os, d.plugin_version && `plugin ${d.plugin_version}`].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {d.online ? `Connecté ${ago(d.online_since, now)}` : `Vu ${ago(d.last_seen, now)}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {confirm === d.id ? (
                  <>
                    <button type="button" disabled={busy} onClick={() => void revoke(d.id)} className={`${btn} border-accent text-foreground`}>
                      Confirmer la révocation
                    </button>
                    <button type="button" onClick={() => setConfirm("")} className={btn}>
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setRenaming({ id: d.id, name: d.name })} className={btn}>
                      Renommer
                    </button>
                    <button type="button" onClick={() => setConfirm(d.id)} className={btn}>
                      Révoquer
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div>
        <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Dernières actions</h3>
        {audit.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Rien pour l&apos;instant.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line text-xs">
            {audit.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
                <span className="min-w-0">
                  <span className="font-mono">{e.method}</span>
                  {e.detail && <span className="text-muted"> · {e.detail}</span>}
                  <span className="text-muted"> · {nameOf(e.device_id)}</span>
                </span>
                <span className={e.ok ? "text-muted" : "text-foreground"}>
                  {e.ok ? ago(e.created_at, now) : `${e.error === "rate_limited" ? "trop rapide" : e.error === "not_allowed" ? "refusé" : "échec"} · ${ago(e.created_at, now)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
