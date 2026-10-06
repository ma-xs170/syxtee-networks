"use client";

import { useCallback, useEffect, useState } from "react";
import { coreFetch } from "./coreClient";

// Enregistrements du compte : espace utilisé sur le serveur (quota par compte), liste des fichiers MOV ou MP4, téléchargement par lien
// signé (5 min, reprise possible) et suppression. Les fichiers viennent du Core (/v1/me/recordings).

type File = { relay_id: string; file: string; size: number; created_at: string; expires_at: string; recording: boolean };
type Data = { used: number; quota: number; retention_days: number; stopped: "quota" | "disk" | null; files: File[] };

const GB = 1024 ** 3;
const size = (n: number) => (n >= GB ? `${(n / GB).toFixed(2)} Go` : `${Math.max(1, Math.round(n / 1024 ** 2))} Mo`);
const when = (f: string) => {
  const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.(?:mp4|mov)$/.exec(f);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : f;
};

const btn = "h-9 whitespace-nowrap rounded-full border border-line px-4 text-sm transition-colors hover:bg-foreground/10 disabled:opacity-40";

export default function Recordings({ coreUrl, relays }: { coreUrl: string; relays: { id: string; name: string; record: boolean }[] }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const names = new Map(relays.map((r) => [r.id, r.name]));

  const load = useCallback(async () => {
    try {
      const res = await coreFetch(coreUrl, "/v1/me/recordings");
      if (res.status === 404) return setError("L'enregistrement n'est pas encore ouvert sur ce serveur.");
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as Data);
      setError(null);
    } catch {
      setError("Le serveur ne répond pas. Réessaie dans un instant.");
    }
  }, [coreUrl]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => void load(), 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  async function download(f: File) {
    setBusy(`${f.relay_id}/${f.file}`);
    try {
      const res = await coreFetch(coreUrl, "/v1/me/recordings/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ relay: f.relay_id, file: f.file }) });
      if (!res.ok) throw new Error(String(res.status));
      const { path } = (await res.json()) as { path: string };
      const a = document.createElement("a");
      a.href = `${coreUrl}${path}`;
      a.click();
    } catch {
      setError("Téléchargement impossible. Réessaie.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(f: File) {
    if (!window.confirm(`Supprimer définitivement l'enregistrement du ${when(f.file)} ?`)) return;
    setBusy(`${f.relay_id}/${f.file}`);
    const res = await coreFetch(coreUrl, `/v1/me/recordings/${f.relay_id}/${f.file}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (!res || (!res.ok && res.status !== 204)) setError("Suppression impossible (fichier en cours d'enregistrement ?).");
    else await load();
  }

  const pct = data ? Math.min(100, (data.used / data.quota) * 100) : 0;
  const active = relays.filter((r) => r.record);

  return (
    <div className="grid gap-6">
      <section aria-labelledby="rec-space" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="rec-space" className="text-sm font-semibold tracking-tight">
            Espace utilisé
          </h2>
          <p className="font-mono text-xs uppercase tracking-wide text-muted">{data ? `${size(data.used)} / ${size(data.quota)}` : "…"}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-labelledby="rec-space">
          <div className="h-full rounded-full bg-foreground/70 transition-[width] motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
        {data?.stopped === "quota" && <p className="mt-3 text-sm text-muted">Ton espace est plein : l&apos;enregistrement est en pause. Télécharge puis supprime des fichiers pour reprendre au prochain direct.</p>}
        {data?.stopped === "disk" && <p className="mt-3 text-sm text-muted">Le serveur manque de place pour le moment : l&apos;enregistrement est en pause. Il reprend dès qu&apos;il y en a de nouveau.</p>}
        <p className="mt-3 text-sm text-muted">Chaque fichier est supprimé automatiquement {data?.retention_days ?? 15} jours après son enregistrement : pense à le télécharger.</p>
        <p className="mt-3 text-sm text-muted">
          {active.length
            ? `Enregistrement activé sur : ${active.map((r) => r.name).join(", ")}. Il démarre au début du direct.`
            : "Aucun relais n'enregistre. Dans Mes relais, ouvre « Plus » puis « Enregistrer le flux »."}
        </p>
      </section>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <section aria-labelledby="rec-files" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 id="rec-files" className="text-sm font-semibold tracking-tight">
          Fichiers
        </h2>
        {!data ? (
          <p className="mt-4 text-sm text-muted">Chargement…</p>
        ) : data.files.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aucun enregistrement pour le moment. Les fichiers sont coupés toutes les 15 minutes, au format MOV (ou MP4, au choix dans le menu « Plus » du relais), sans perte de qualité, et supprimés automatiquement après 15 jours.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {data.files.map((f) => {
              const key = `${f.relay_id}/${f.file}`;
              return (
                <li key={key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{names.get(f.relay_id) ?? "Relais supprimé"}</p>
                    <p className="font-mono text-xs text-muted">
                      {when(f.file)} · {size(f.size)} · supprimé le {new Date(f.expires_at).toLocaleDateString("fr-FR")}
                      {f.recording && <span className="ml-2 text-[color:var(--live)]">● En cours</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={btn} disabled={busy === key} onClick={() => download(f)}>
                      Télécharger
                    </button>
                    <button type="button" className={`${btn} text-red-300`} disabled={busy === key || f.recording} onClick={() => remove(f)}>
                      Supprimer
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
