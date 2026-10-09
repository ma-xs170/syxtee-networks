"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DownloadSimple, AppleLogo } from "@/components/icons";
import { fmtMo, pluginState, since, type PluginLatest } from "@/lib/plugin";
import { useLiveStatus } from "./LiveStatus";
import { useLinkDevices, type DevicesDemo, type LinkDevice } from "./useLinkDevices";
import { Tile } from "./ui";

// Contrôle à distance, liste des postes : « En ligne (n) » et « Hors ligne (n) », une carte par poste avec « Piloter OBS ».

const pilot = "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium transition-colors";
const pilotOff = "inline-flex h-10 cursor-not-allowed items-center justify-center whitespace-nowrap rounded-full border border-line px-5 text-sm text-muted";

/** Plugin pour macOS : toujours à portée, que l'on ait déjà un OBS relié ou non. Les étapes complètes sont sur la page Plugin OBS. */
function PluginBar({ coreUrl, latest }: { coreUrl: string; latest: PluginLatest | null }) {
  const mac = latest?.macos;
  return (
    <section aria-label="Plugin OBS pour macOS" className="flex flex-col gap-4 tile p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line">
          <AppleLogo size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">Plugin OBS pour macOS</h2>
          <p className="mt-0.5 text-sm text-muted">
            {mac?.available ? `Version ${latest!.version}${mac.size ? ` · ${fmtMo(mac.size)}` : ""} · Mac Apple Silicon et Intel` : "La version macOS arrive dans un instant."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/plugin" className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
          Comment l&apos;installer
        </Link>
        {mac?.available && mac.url ? (
          <a href={`${coreUrl}${mac.url}`} download className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium transition-colors">
            <DownloadSimple size={18} aria-hidden="true" />
            Télécharger pour macOS
          </a>
        ) : (
          <span aria-disabled="true" className="inline-flex h-11 cursor-not-allowed items-center justify-center whitespace-nowrap rounded-full border border-line px-5 text-sm text-muted">
            Bientôt
          </span>
        )}
      </div>
    </section>
  );
}

function Card({ d, now, pushing, outdated }: { d: LinkDevice; now: number; pushing: string[]; outdated: boolean }) {
  return (
    <li className="flex flex-col gap-4 tile p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] ${d.online ? "text-foreground" : "text-muted"}`}>
          <span aria-hidden="true" className={`size-2 rounded-full ${d.online ? "bg-foreground" : "border border-muted"}`} />
          {d.online ? `Connecté depuis ${since(d.online_since, now)}` : "Hors ligne"}
        </p>
        <p className="mt-2 truncate text-lg font-semibold tracking-tight">{d.name}</p>
        <p className="mt-1 font-mono text-xs text-muted">
          Plugin {d.plugin_version || "?"}
          {outdated && <span className="text-foreground"> · mise à jour disponible</span>}
          {d.online && pushing.length > 0 && ` · pousse ${pushing.join(", ")}`}
        </p>
      </div>
      {d.online ? (
        <Link href={`/controle-a-distance/${d.id}`} className={pilot}>
          Piloter OBS
        </Link>
      ) : (
        <span aria-disabled="true" className={pilotOff}>
          Piloter OBS
        </span>
      )}
    </li>
  );
}

export default function RemoteList({ coreUrl, demo }: { coreUrl: string; demo?: DevicesDemo }) {
  const { devices, latest, error } = useLinkDevices(coreUrl, 3000, demo);
  const live = useLiveStatus();
  const pushing = (live.state?.relays ?? []).filter((r) => r.live).map((r) => r.name);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (error && !devices) return <Tile><p className="text-sm text-muted">{error}</p></Tile>;
  if (!devices) return <p className="text-sm text-muted">Chargement…</p>;
  if (devices.length === 0)
    return (
      <div className="grid gap-4">
        <PluginBar coreUrl={coreUrl} latest={latest} />
        <Tile>
          <h2 className="text-lg font-semibold tracking-tight">Aucun OBS relié</h2>
          <p className="mt-2 max-w-[60ch] text-sm text-muted">Installe le plugin sur l&apos;ordinateur d&apos;OBS : tu pourras changer de scène, lancer le direct et régler le son depuis ton téléphone, où que tu sois.</p>
        </Tile>
      </div>
    );

  const online = devices.filter((d) => d.online);
  const offline = devices.filter((d) => !d.online);
  return (
    <div className="grid gap-8">
      <PluginBar coreUrl={coreUrl} latest={latest} />
      {[
        ["En ligne", online],
        ["Hors ligne", offline],
      ].map(([title, list]) => (
        <section key={title as string} aria-labelledby={`h-${title}`}>
          <h2 id={`h-${title}`} className="mb-3 flex items-center gap-2 text-sm font-semibold">
            {title as string} <span className="font-mono text-xs font-normal tabular-nums text-muted">({(list as LinkDevice[]).length})</span>
          </h2>
          {(list as LinkDevice[]).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-5 py-4 text-sm text-muted">{title === "En ligne" ? "Aucun OBS en ligne. Ouvre OBS sur ton ordinateur." : "Aucun poste hors ligne."}</p>
          ) : (
            <ul className="grid gap-3">
              {(list as LinkDevice[]).map((d) => (
                <Card key={d.id} d={d} now={now} pushing={pushing} outdated={pluginState(d.plugin_version, latest) === "outdated"} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
