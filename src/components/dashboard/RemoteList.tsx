"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DownloadSimple, AppleLogo, WindowsLogo } from "@/components/icons";
import { detectOs, fmtMo, pluginState, since, type OsId, type PluginLatest } from "@/lib/plugin";
import { sendOnce } from "../remote/callDevice";
import { Confirm, type ConfirmAsk } from "../remote/ui";
import { useLiveStatus } from "./LiveStatus";
import { useLinkDevices, type DevicesDemo, type LinkDevice } from "./useLinkDevices";
import { Tile } from "./ui";
import { cx } from "../remote/ui";

// Contrôle à distance, liste des postes : « En ligne (n) » et « Hors ligne (n) », une carte par poste avec « Piloter OBS » (en ligne)
// ou « Lancer OBS » (hors ligne : le Gardien du Mac rouvre OBS, après confirmation).

const pilot = "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium transition-colors";

/** Plugin OBS : le fichier du système du visiteur (Mac par défaut), toujours à portée. Les étapes complètes sont sur la page Plugin OBS. */
function PluginBar({ coreUrl, latest }: { coreUrl: string; latest: PluginLatest | null }) {
  const [detected, setDetected] = useState<OsId | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDetected(detectOs(navigator.userAgent, navigator.platform)), 0);
    return () => clearTimeout(t);
  }, []);
  const id: OsId = detected === "windows" ? "windows" : "macos";
  const file = latest?.[id];
  const label = id === "windows" ? "Windows" : "macOS";
  const Icon = id === "windows" ? WindowsLogo : AppleLogo;
  return (
    <section aria-label={`Plugin OBS pour ${label}`} className="flex flex-col gap-4 tile p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line">
          <Icon size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">Plugin OBS pour {label}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {file?.available
              ? `Version ${latest!.version}${file.size ? ` · ${fmtMo(file.size)}` : ""} · ${id === "windows" ? `Windows 10 et 11${file.beta ? " · bêta" : ""}` : "Mac Apple Silicon et Intel"}`
              : `La version ${label} arrive dans un instant.`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/plugin" className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
          Comment l&apos;installer
        </Link>
        {file?.available && file.url ? (
          <a href={`${coreUrl}${file.url}`} download className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium transition-colors">
            <DownloadSimple size={18} aria-hidden="true" />
            Télécharger pour {label}
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

function Card({ d, now, pushing, outdated, coreUrl }: { d: LinkDevice; now: number; pushing: string[]; outdated: boolean; coreUrl: string }) {
  const [ask, setAsk] = useState<ConfirmAsk>(null);
  const [state, setState] = useState<"idle" | "launching" | "sent">("idle");
  const [error, setError] = useState("");

  /** OBS fermé : le Gardien SYXTEE du Mac le rouvre. Le poste repasse « En ligne » tout seul dès que le plugin se reconnecte. */
  async function launch() {
    setState("launching");
    setError("");
    try {
      await sendOnce(coreUrl, d.id, "guardian.launchObs", {}, 20_000);
      setState("sent");
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  }
  const launchAsk = () => setAsk({ title: "Lancer OBS ?", text: `Êtes-vous sûr de vouloir lancer OBS sur ${d.name} ? Il s'ouvre à distance, sur l'ordinateur.`, ok: "Oui, lancer OBS", run: () => void launch() });

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
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button type="button" disabled={state !== "idle"} onClick={launchAsk} className={cx(pilot, "disabled:opacity-60")}>
            {state === "launching" ? "Envoi…" : state === "sent" ? "Lancement d'OBS…" : "Lancer OBS"}
          </button>
          {state === "sent" && <p role="status" className="text-[13px] text-muted">OBS s&apos;ouvre, le poste repasse en ligne dans un instant.</p>}
          {error && <p role="alert" className="max-w-[28ch] text-[13px] text-warn sm:text-right">{error}</p>}
        </div>
      )}
      <Confirm ask={ask} onClose={() => setAsk(null)} />
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
                <Card key={d.id} d={d} now={now} pushing={pushing} outdated={pluginState(d.plugin_version, latest) === "outdated"} coreUrl={coreUrl} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
