"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DownloadSimple } from "@/components/icons";
import { ago, detectOs, pluginState, since, type OsId, type PluginLatest } from "@/lib/plugin";
import { useLiveStatus } from "./LiveStatus";
import { useLinkDevices, type DevicesDemo, type LinkDevice } from "./useLinkDevices";
import { ArrowLink } from "./ui";
import { Card, Pill } from "./panel";

// « Mes OBS » : les postes OBS reliés au compte (état, version du plugin, renommer, révoquer) et le téléchargement du plugin.
// Trois étapes quand il n'y a encore aucun poste.

const btnGhost = "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-line px-4 text-xs font-medium transition-colors hover:bg-foreground/10 disabled:opacity-40";
const btnPrimary = "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium transition-colors";

/** Bouton « Télécharger le plugin » : le fichier du système du visiteur s'il existe, sinon la page Plugin OBS. */
export function DownloadButton({ coreUrl, latest, className = btnPrimary, label = "Télécharger le plugin" }: { coreUrl: string; latest: PluginLatest | null; className?: string; label?: string }) {
  const [os, setOs] = useState<OsId | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setOs(detectOs(navigator.userAgent, navigator.platform)), 0);
    return () => clearTimeout(t);
  }, []);
  const file = os && latest ? latest[os] : null;
  return file?.available && file.url ? (
    <a href={`${coreUrl}${file.url}`} download className={className}>
      <DownloadSimple size={16} aria-hidden="true" />
      {label}
    </a>
  ) : (
    <Link href="/dashboard/plugin" className={className}>
      <DownloadSimple size={16} aria-hidden="true" />
      {label}
    </Link>
  );
}

export function DeviceRows({
  devices,
  latest,
  pushing,
  onRename,
  onRevoke,
  action,
}: {
  devices: LinkDevice[];
  latest: PluginLatest | null;
  /** Caméras qui poussent un flux en ce moment (noms des relais en direct). */
  pushing: string[];
  onRename: (id: string, name: string) => Promise<boolean>;
  onRevoke: (id: string) => Promise<boolean>;
  action?: (d: LinkDevice) => React.ReactNode;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {error && (
        <p role="alert" className="mb-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <ul className="grid gap-3">
        {devices.map((d) => {
          const st = pluginState(d.plugin_version, latest);
          return (
            <li key={d.id} className="grid gap-3 rounded-xl border border-line p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {renaming?.id === d.id ? (
                    <form
                      className="flex gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBusy(true);
                        const ok = await onRename(d.id, renaming.name.trim());
                        setBusy(false);
                        if (ok) setRenaming(null);
                        else setError("Renommage impossible.");
                      }}
                    >
                      <input value={renaming.name} onChange={(e) => setRenaming({ id: d.id, name: e.target.value.slice(0, 40) })} aria-label="Nom du poste" className="h-9 rounded-lg border border-line bg-background px-3 text-sm" autoFocus />
                      <button type="submit" disabled={busy || !renaming.name.trim()} className={btnGhost}>
                        Enregistrer
                      </button>
                    </form>
                  ) : (
                    <p className="truncate text-sm font-medium">{d.name}</p>
                  )}
                  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] ${d.online ? "text-foreground" : "text-muted"}`}>
                    <span aria-hidden="true" className={`size-2 rounded-full ${d.online ? "bg-foreground" : "border border-muted"}`} />
                    {d.online ? "En ligne" : "Hors ligne"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted">
                  {d.plugin_version ? `Plugin ${d.plugin_version}` : "Plugin"}
                  {st === "ok" && ", à jour"}
                  {st === "outdated" && latest && <span className="text-foreground">, mise à jour disponible ({latest.version})</span>}
                  {d.online && pushing.length > 0 && ` · pousse ${pushing.join(", ")}`}
                </p>
                <p className="mt-0.5 text-xs text-muted">{d.online ? (d.online_since ? `Connecté depuis ${since(d.online_since, now)}` : "") : `Vu ${ago(d.last_seen, now)}`}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {action?.(d)}
                {confirm === d.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const ok = await onRevoke(d.id);
                        setBusy(false);
                        setConfirm("");
                        if (!ok) setError("Révocation impossible.");
                      }}
                      className={`${btnGhost} border-accent text-foreground`}
                    >
                      Confirmer la révocation
                    </button>
                    <button type="button" onClick={() => setConfirm("")} className={btnGhost}>
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setRenaming({ id: d.id, name: d.name })} className={btnGhost}>
                      Renommer
                    </button>
                    <button type="button" onClick={() => setConfirm(d.id)} className={btnGhost}>
                      Révoquer
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

const STEPS = [
  { t: "Installer", d: "Ouvre le fichier téléchargé et suis l'installation." },
  { t: "Ouvrir OBS", d: "Menu SYXTEE, puis Connecter." },
  { t: "Autoriser", d: "Confirme l'ordinateur dans la page qui s'ouvre." },
];

export default function MesObs({ coreUrl, demo }: { coreUrl: string; demo?: DevicesDemo }) {
  const { devices, latest, error } = useLinkDevices(coreUrl, 5000, demo);
  const live = useLiveStatus();
  const pushing = (live.state?.relays ?? []).filter((r) => r.live).map((r) => r.name).filter(Boolean);

  return (
    <Card title="Mes OBS" action={<ArrowLink href="/dashboard/controle-a-distance">Ouvrir</ArrowLink>}>
      {error && !devices ? (
        <p className="py-5 text-sm text-muted">{error}</p>
      ) : !devices ? (
        <p className="py-5 text-sm text-muted">Chargement…</p>
      ) : devices.length === 0 ? (
        <div className="py-5">
          <p className="text-sm text-muted">Aucun OBS relié. Le plugin te permet de piloter OBS depuis le site, même depuis ton téléphone.</p>
          <ol className="mt-4 grid gap-3">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line font-mono text-xs text-muted">{i + 1}</span>
                <span className="text-sm">
                  <span className="block font-medium">{s.t}</span>
                  <span className="block text-muted">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <DownloadButton coreUrl={coreUrl} latest={latest} />
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {devices.slice(0, 4).map((d) => {
            const st = pluginState(d.plugin_version, latest);
            return (
              <li key={d.id} className="flex min-h-[4rem] items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">{d.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    Plugin {d.plugin_version || "?"}
                    {st === "outdated" ? " · mise à jour disponible" : ""}
                    {d.online && pushing.length > 0 ? ` · pousse ${pushing.join(", ")}` : ""}
                  </p>
                </div>
                <Pill tone={d.online ? "ok" : "idle"}>{d.online ? "En ligne" : "Hors ligne"}</Pill>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
