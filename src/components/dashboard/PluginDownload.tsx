"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppleLogo, DownloadSimple, LinuxLogo, WindowsLogo } from "@/components/icons";
import { detectOs, fmtMo, OS_LABEL, type OsId, type PluginLatest } from "@/lib/plugin";
import { useLinkDevices, type DevicesDemo } from "./useLinkDevices";
import { Tile } from "./ui";

// Page « Plugin OBS SYXTEE » : une carte par système, celle du visiteur en premier avec « TON SYSTÈME » et le bouton principal.
// Après l'installation, la page repère le poste dès qu'il passe en ligne.

const ICON = { macos: AppleLogo, windows: WindowsLogo, linux: LinuxLogo } as const;
const ORDER: OsId[] = ["macos", "windows", "linux"];
const primary = "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover";
const ghost = "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line-strong px-5 text-sm font-medium transition-colors hover:bg-foreground/10";
const disabled = "inline-flex h-11 w-full cursor-not-allowed items-center justify-center whitespace-nowrap rounded-full border border-line px-5 text-sm text-muted";

export default function PluginDownload({ coreUrl, latest: initial, demo }: { coreUrl: string; latest: PluginLatest | null; demo?: DevicesDemo }) {
  const [os, setOs] = useState<OsId | null>(null);
  const { devices, latest: fresh } = useLinkDevices(coreUrl, 3000, demo);
  const latest = fresh ?? initial;
  useEffect(() => {
    const t = setTimeout(() => setOs(detectOs(navigator.userAgent, navigator.platform)), 0);
    return () => clearTimeout(t);
  }, []);
  const online = (devices ?? []).filter((d) => d.online);
  const order = os ? [os, ...ORDER.filter((o) => o !== os)] : ORDER;

  return (
    <div className="grid gap-5">
      {online.length > 0 && (
        <section role="status" className="rounded-2xl border border-line-strong bg-surface p-5 sm:p-6">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em]">
            <span aria-hidden="true" className="size-2 rounded-full bg-foreground" />
            Plugin détecté
          </p>
          <p className="mt-2 text-sm text-muted">
            <span className="text-foreground">{online[0].name}</span>
            {online[0].plugin_version ? ` (plugin ${online[0].plugin_version})` : ""} est connecté à ton compte.
          </p>
          <Link href="/dashboard/controle-a-distance" className={`${primary} mt-4 sm:w-fit`}>
            Ouvrir le contrôle à distance <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}

      {!latest && (
        <Tile>
          <p className="text-sm text-muted">Aucune version du plugin n&apos;est publiée pour le moment. Reviens dans un instant.</p>
        </Tile>
      )}

      <ul className="grid gap-4 md:grid-cols-3">
        {order.map((id) => {
          const Icon = ICON[id];
          const file = latest?.[id];
          const mine = os === id;
          const soon = id === "linux";
          return (
            <li key={id} className={`flex flex-col rounded-2xl border bg-surface p-5 ${mine ? "border-line-strong" : "border-line"}`}>
              <div className="flex items-center justify-between gap-3">
                <Icon size={28} aria-hidden="true" />
                {mine && <span className="rounded border border-foreground/30 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em]">TON SYSTÈME</span>}
              </div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">{OS_LABEL[id]}</h2>
              <p className="mt-1 font-mono text-xs text-muted">
                {soon ? "Indisponible" : file?.available ? `Version ${latest!.version} · ${fmtMo(file.size)}${file.beta ? " · bêta" : ""}` : id === "windows" ? "Bêta · bientôt disponible" : "Pas encore publié"}
              </p>
              <p className="mt-3 flex-1 text-sm text-muted">
                {id === "macos" && "Installeur universel : Mac Apple Silicon et Intel. OBS 30 ou plus récent."}
                {id === "windows" && "Installeur pour Windows 10 et 11. OBS 30 ou plus récent."}
                {id === "linux" && "Pas de plugin Linux pour le moment."}
              </p>
              <div className="mt-5">
                {file?.available && file.url ? (
                  <a href={`${coreUrl}${file.url}`} download className={mine ? primary : ghost}>
                    <DownloadSimple size={16} aria-hidden="true" />
                    Télécharger{file.beta ? " (bêta)" : ""}
                  </a>
                ) : (
                  <span className={disabled}>{soon ? "Indisponible" : "Bientôt"}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {(os === "macos" || os === null) && (
        <details className="rounded-2xl border border-line bg-surface p-5 [&_summary]:cursor-pointer">
          <summary className="text-sm font-medium">Le Mac bloque l&apos;installation ?</summary>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>Fais un clic droit sur le fichier téléchargé, puis Ouvrir, puis Ouvrir quand même.</li>
            <li>
              Si le Mac refuse encore : Réglages Système, Confidentialité et sécurité, descends jusqu&apos;à « SYXTEE-Link a été bloqué », puis <strong className="text-foreground">Ouvrir quand même</strong>.
            </li>
            <li>Quitte OBS, relance-le : le menu <strong className="text-foreground">SYXTEE</strong> apparaît dans la barre, à côté d&apos;Aide.</li>
          </ol>
          <p className="mt-3 text-xs text-muted">Cette étape disparaîtra quand l&apos;installeur sera notarisé par Apple.</p>
        </details>
      )}

      <Tile aria-labelledby="install">
        <h2 id="install" className="text-sm font-semibold">
          Installer en trois étapes
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["Installer", "Ouvre le fichier téléchargé."],
            ["Ouvrir OBS", "Menu SYXTEE, puis Connecter."],
            ["Autoriser", "Confirme ton ordinateur sur la page qui s'ouvre."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line font-mono text-xs text-muted">{i + 1}</span>
              <span className="text-sm">
                <span className="block font-medium">{t}</span>
                <span className="block text-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </Tile>

      {latest && latest.notes.length > 0 && (
        <Tile aria-labelledby="nouveautes">
          <h2 id="nouveautes" className="text-sm font-semibold">
            Nouveautés de la version {latest.version}
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
            {latest.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Tile>
      )}
    </div>
  );
}
