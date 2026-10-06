"use client";

import { useCallback, useEffect, useState } from "react";
import { coreFetch } from "../dashboard/coreClient";

// Sauvegardes de scènes : collections OBS (scènes, sources, filtres) avec leurs médias, sur l'espace du compte (5 Go).
// L'archive est créée et envoyée par SYXTEE Link depuis le PC ; restaurer ajoute la collection à OBS sans toucher aux existantes.

type Row = { id: string; name: string; collection: string; size: number; media_count: number; obs_version: string; host: string; created_at: string };
type Job = { kind: string; state: string; progress: number; message: string } | null;
type Call = <T = Record<string, unknown>>(method: string, params?: Record<string, unknown>) => Promise<T>;

const fmt = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} Go` : n >= 1e6 ? `${(n / 1e6).toFixed(0)} Mo` : `${Math.max(1, Math.round(n / 1e3))} Ko`);
const btn = "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-40";

export default function Backups({ coreUrl, ready, call, job }: { coreUrl: string; ready: boolean; call: Call; job: Job }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [used, setUsed] = useState(0);
  const [quota, setQuota] = useState(5 * 1024 ** 3);
  const [cols, setCols] = useState<{ name: string; media: number; bytes: number }[]>([]);
  const [col, setCol] = useState("");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const r = await coreFetch(coreUrl, "/v1/me/link/backups").catch(() => null);
    if (!r?.ok) return setError(r?.status === 403 ? "Les sauvegardes sont réservées aux comptes invités." : "Impossible de charger tes sauvegardes.");
    const j = await r.json();
    setRows(j.backups);
    setUsed(j.used);
    setQuota(j.quota);
  }, [coreUrl]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, tick]);

  // Une sauvegarde ou une restauration vient de se terminer : on recharge la liste.
  const finished = job?.state === "done" ? job.message : "";
  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(() => setTick((n) => n + 1), 0);
    return () => clearTimeout(t);
  }, [finished]);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    call<{ collections: { name: string; media: number; bytes: number }[] }>("link.collections")
      .then((r) => {
        if (!live) return;
        setCols(r.collections);
        setCol((c) => c || r.collections[0]?.name || "");
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [ready, call]);

  const running = job?.state === "running";
  const sel = cols.find((c) => c.name === col);
  const pct = Math.min(100, (used / quota) * 100);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="grid content-start gap-4 rounded-2xl border border-line bg-surface p-4" aria-label="Sauvegarder">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Sauvegarder mes scènes</h2>
        {!ready ? (
          <p className="text-sm text-muted">Ouvre OBS sur ton ordinateur (avec SYXTEE Link) pour sauvegarder tes scènes.</p>
        ) : (
          <>
            <label className="grid gap-1 text-xs text-muted">
              Collection de scènes
              <select value={col} onChange={(e) => setCol(e.target.value)} className="h-11 rounded-xl border border-line bg-background px-3 text-sm text-foreground">
                {cols.map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
              </select>
            </label>
            {sel && (
              <p className="text-xs text-muted">
                {sel.media} média{sel.media > 1 ? "s" : ""} · {fmt(sel.bytes)} avant compression. Les scripts OBS ne sont pas inclus.
              </p>
            )}
            <button
              type="button"
              disabled={running || !col}
              onClick={() => {
                setError("");
                call("link.backupNow", { collection: col }).catch((e: Error) => setError(e.message));
              }}
              className={`${btn} bg-accent text-on-accent hover:bg-accent-hover`}
            >
              Sauvegarder maintenant
            </button>
          </>
        )}
        {job && (
          <div role="status" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-accent/10">
              <div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{ width: `${Math.round(job.progress * 100)}%` }} />
            </div>
            <p className={`mt-2 text-sm ${job.state === "error" ? "text-red-400" : "text-muted"}`}>{job.message}</p>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <div>
          <div className="flex items-baseline justify-between text-xs text-muted">
            <span>Espace utilisé</span>
            <span className="font-mono tabular-nums">
              {fmt(used)} / {fmt(quota)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent/10" aria-hidden="true">
            <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4" aria-label="Mes sauvegardes">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Mes sauvegardes</h2>
        {rows === null ? (
          <p className="mt-3 text-sm text-muted">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucune sauvegarde pour l&apos;instant.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted">
                    {new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} · {fmt(r.size)} · {r.media_count} média{r.media_count > 1 ? "s" : ""}
                    {r.host ? ` · ${r.host}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!ready || running}
                    onClick={() => call("link.restore", { id: r.id }).catch((e: Error) => setError(e.message))}
                    className={`${btn} border border-line-strong hover:bg-accent/10`}
                    title={ready ? "Ajoute cette collection à OBS" : "OBS doit être ouvert"}
                  >
                    Restaurer
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Supprimer « ${r.name} » de ton espace ?`)) return;
                      await coreFetch(coreUrl, `/v1/me/link/backups/${r.id}`, { method: "DELETE" }).catch(() => null);
                      setTick((n) => n + 1);
                    }}
                    className={`${btn} border border-line px-3 text-muted hover:text-foreground`}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
