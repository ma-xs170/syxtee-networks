"use client";

import { useCallback, useEffect, useState } from "react";
import { coreFetch } from "./coreClient";
import { Tile } from "./ui";

// Backups de scènes (lecture et suppression). La sauvegarde et l'import se lancent depuis le plugin ou, pour l'import, depuis ce site.

type Row = { id: string; name: string; collection: string; version: number; size: number; media_count: number; obs_version: string; host: string; created_at: string };

const fmt = (n: number) => (n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} Go` : n >= 1024 ** 2 ? `${Math.round(n / 1024 ** 2)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);
const btn = "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-line px-4 text-xs font-medium transition-colors hover:bg-foreground/10 disabled:opacity-40";

export default function BackupsList({ coreUrl }: { coreUrl: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [used, setUsed] = useState(0);
  const [quota, setQuota] = useState(5 * 1024 ** 3);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await coreFetch(coreUrl, "/v1/me/link/backups").catch(() => null);
    if (!r?.ok) return setError(r?.status === 403 ? "Les sauvegardes sont réservées aux comptes invités." : "Impossible de charger tes sauvegardes.");
    const j = await r.json();
    setError("");
    setRows(j.backups);
    setUsed(j.used);
    setQuota(j.quota);
  }, [coreUrl]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function remove(id: string) {
    setBusy(true);
    const r = await coreFetch(coreUrl, `/v1/me/link/backups/${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setConfirm("");
    if (r?.ok) await load();
    else setError("Suppression impossible.");
  }

  if (error && !rows) return <Tile><p className="text-sm text-muted">{error}</p></Tile>;
  if (!rows) return <p className="text-sm text-muted">Chargement…</p>;

  // Collections regroupées, versions de la plus récente à la plus ancienne.
  const groups = new Map<string, Row[]>();
  for (const r of rows) groups.set(r.collection || r.name, [...(groups.get(r.collection || r.name) ?? []), r]);
  const pct = Math.min(100, (used / quota) * 100);

  return (
    <div className="grid gap-6">
      <Tile aria-labelledby="quota">
        <h2 id="quota" className="text-sm font-semibold">
          Espace utilisé
        </h2>
        <p className="mt-2 font-mono text-sm tabular-nums">
          {fmt(used)} <span className="text-muted">sur {fmt(quota)}</span>
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Espace utilisé">
          <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
        </div>
      </Tile>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {groups.size === 0 ? (
        <Tile>
          <p className="text-sm text-muted">Aucune sauvegarde. Dans OBS : menu SYXTEE, onglet Collections, puis Sauvegarder.</p>
        </Tile>
      ) : (
        [...groups.entries()].map(([name, versions]) => (
          <Tile key={name} aria-labelledby={`g-${name}`}>
            <h2 id={`g-${name}`} className="text-lg font-semibold tracking-tight">
              {name}
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {versions
                .sort((a, b) => b.version - a.version)
                .map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 text-sm">
                      <p>
                        <span className="font-mono">v{v.version}</span> · {new Date(v.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted">
                        {fmt(v.size)} · {v.media_count} médias{v.host ? ` · ${v.host}` : ""}
                      </p>
                    </div>
                    {confirm === v.id ? (
                      <div className="flex gap-2">
                        <button type="button" disabled={busy} onClick={() => void remove(v.id)} className={`${btn} border-accent text-accent`}>
                          Confirmer la suppression
                        </button>
                        <button type="button" onClick={() => setConfirm("")} className={btn}>
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirm(v.id)} className={btn}>
                        Supprimer
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          </Tile>
        ))
      )}
    </div>
  );
}
