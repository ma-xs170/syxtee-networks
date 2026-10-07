"use client";

import { useCallback, useEffect, useState } from "react";
import { callDevice, type JobState } from "../remote/callDevice";
import { coreFetch } from "./coreClient";
import { useLinkDevices, type DevicesDemo } from "./useLinkDevices";
import { Tile } from "./ui";

// Backups de scènes : collections sauvegardées, versions (les 4 dernières), taille, poste d'origine, quota en octets UNIQUES
// (un fichier identique n'est stocké qu'une fois, même entre versions et collections). « Importer sur un poste » ajoute la collection
// à l'OBS choisi, avec ses médias, sans toucher à sa collection ouverte. Supprimer une version ne libère que ses fichiers à elle.

export type BackupRow = { id: string; name: string; collection: string; version: number; size: number; media_count: number; obs_version: string; host: string; created_at: string; format?: number; new_bytes?: number };

const fmt = (n: number) => (n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1).replace(".", ",")} Go` : n >= 1024 ** 2 ? `${Math.round(n / 1024 ** 2)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);
const btn = "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-line px-4 text-xs font-medium transition-colors hover:bg-foreground/10 disabled:opacity-40";

export type BackupsDemo = { rows: BackupRow[]; used: number; quota: number; devices: DevicesDemo };

export default function BackupsList({ coreUrl, demo }: { coreUrl: string; demo?: BackupsDemo }) {
  const [rows, setRows] = useState<BackupRow[] | null>(demo?.rows ?? null);
  const [used, setUsed] = useState(demo?.used ?? 0);
  const [quota, setQuota] = useState(demo?.quota ?? 5 * 1024 ** 3);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState("");
  const [job, setJob] = useState<{ id: string; text: string; state: JobState["state"] | "start" } | null>(null);
  const { devices } = useLinkDevices(coreUrl, 5000, demo?.devices);
  const online = (devices ?? []).filter((d) => d.online);
  const device = online.find((d) => d.id === target) ?? online[0];

  const load = useCallback(async () => {
    if (demo) return;
    const r = await coreFetch(coreUrl, "/v1/me/link/backups").catch(() => null);
    if (!r?.ok) return setError(r?.status === 403 ? "Les sauvegardes sont réservées aux comptes invités." : "Impossible de charger tes sauvegardes.");
    const j = await r.json();
    setError("");
    setRows(j.backups);
    setUsed(j.used);
    setQuota(j.quota);
  }, [coreUrl, demo]);

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

  async function importTo(id: string) {
    if (!device) return;
    setError("");
    setJob({ id, text: `Envoi de la commande à ${device.name}…`, state: "start" });
    try {
      const j = await callDevice(coreUrl, device.id, "link.restore", { id }, (s) => setJob({ id, text: s.message, state: s.state }));
      setJob({ id, text: j.message, state: "done" });
    } catch (e) {
      setJob({ id, text: (e as Error).message, state: "error" });
    }
  }

  if (error && !rows) return <Tile><p className="text-sm text-muted">{error}</p></Tile>;
  if (!rows) return <p className="text-sm text-muted">Chargement…</p>;

  // Collections regroupées, versions de la plus récente à la plus ancienne.
  const groups = new Map<string, BackupRow[]>();
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
        <p className="mt-3 text-xs text-muted">Un fichier identique n&apos;est stocké qu&apos;une fois, même s&apos;il est dans plusieurs versions ou collections : seuls les octets uniques comptent.</p>
      </Tile>

      {rows.length > 0 && (
        <Tile aria-labelledby="cible">
          <h2 id="cible" className="text-sm font-semibold">
            Importer sur
          </h2>
          {online.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Aucun OBS en ligne. Ouvre OBS sur l&apos;ordinateur où importer la collection.</p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <select value={device?.id ?? ""} onChange={(e) => setTarget(e.target.value)} aria-label="Poste cible" className="h-10 rounded-xl border border-line bg-background px-3 text-sm">
                {online.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted">La collection est ajoutée à cet OBS, avec ses médias. Ta collection ouverte n&apos;est pas touchée.</p>
            </div>
          )}
        </Tile>
      )}

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
              {[...versions]
                .sort((a, b) => b.version - a.version)
                .map((v) => (
                  <li key={v.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 text-sm">
                        <p>
                          <span className="font-mono">v{v.version}</span> · {new Date(v.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-muted">
                          {fmt(v.size)} · {v.media_count} médias{v.host ? ` · ${v.host}` : ""}
                          {v.format === 2 && ` · +${v.new_bytes ? fmt(v.new_bytes) : "0 Ko"} au quota`}
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
                        <div className="flex gap-2">
                          <button type="button" disabled={!device || job?.state === "running" || job?.state === "start"} onClick={() => void importTo(v.id)} className={btn}>
                            Importer sur {device ? device.name : "un poste"}
                          </button>
                          <button type="button" onClick={() => setConfirm(v.id)} className={btn}>
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                    {job?.id === v.id && (
                      <p role="status" className={`mt-2 text-xs ${job.state === "error" ? "text-red-400" : "text-muted"}`}>
                        {job.text}
                      </p>
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
