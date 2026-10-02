"use client";

import { useEffect, useState } from "react";
import { coreFetch } from "../dashboard/coreClient";
import { site } from "@/lib/site";
import type { Agent, LinkState } from "./useLink";

// Installation et état de SYXTEE Link (le plugin d'OBS), appareils connectés au compte.

type Device = { id: string; name: string; platform: string; last_seen: string | null; online: boolean };
const OS: Record<string, string> = { darwin: "macOS", win32: "Windows", linux: "Linux" };
const btn = "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors";

export default function Connect({ coreUrl, link, agent, obsDown, compact }: { coreUrl: string; link: LinkState; agent: Agent; obsDown: boolean; compact?: boolean }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (link !== "on") return;
    let live = true;
    coreFetch(coreUrl, "/v1/me/link/devices")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && j && setDevices(j.devices))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [coreUrl, link, agent.online, tick]);

  const message =
    link === "denied"
      ? "Le Studio est réservé aux comptes invités. Demande ton invitation sur le Discord."
      : link === "connecting"
        ? "Connexion au serveur…"
        : link === "off"
          ? "Serveur injoignable pour le moment. Nouvelle tentative…"
          : !agent.online
            ? "OBS n'est pas relié à ton compte. Installe SYXTEE Link, puis ouvre OBS sur ton ordinateur."
            : obsDown
              ? "SYXTEE Link est là, mais OBS est fermé ou son serveur WebSocket est désactivé (Outils, Paramètres du serveur WebSocket)."
              : "";

  return (
    <div className="grid gap-4">
      {message && (
        <section className="rounded-2xl border border-line bg-surface p-5" role="status">
          <h2 className="text-lg font-semibold tracking-tight">{link === "denied" ? "Accès sur invitation" : "Relie ton OBS"}</h2>
          <p className="mt-2 max-w-[60ch] text-sm text-muted">{message}</p>
          {link === "denied" && (
            <a href={site.discord} target="_blank" rel="noopener noreferrer" className={`${btn} mt-4 bg-accent text-on-accent hover:bg-accent-hover`}>
              Demander une invitation
            </a>
          )}
        </section>
      )}

      {link !== "denied" && (!compact || !agent.online) && (
        <section className="rounded-2xl border border-line bg-surface p-5" aria-label="Installer SYXTEE Link">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Installer SYXTEE Link</h2>
          <ol className="mt-4 grid gap-4 text-sm text-muted">
            <li>
              <b className="text-foreground">1. Télécharge le plugin</b> et lance l&apos;installeur. Il s&apos;installe dans OBS tout seul, sans mot de passe.
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`${coreUrl}/dl/SYXTEE-Link-mac.pkg`} className={`${btn} bg-accent text-on-accent hover:bg-accent-hover`}>
                  macOS
                </a>
                <a href={`${coreUrl}/dl/SYXTEE-Link-windows.exe`} className={`${btn} border border-line-strong hover:bg-accent/10`}>
                  Windows
                </a>
              </div>
            </li>
            <li>
              <b className="text-foreground">2. Ouvre OBS.</b> Le plugin démarre avec lui et ouvre cette page pour confirmer la connexion de ton ordinateur à ton compte.
            </li>
            <li>
              <b className="text-foreground">3. Sauvegarde tes scènes</b> quand le plugin te le propose (5 Go par compte), puis reviens ici : l&apos;interface d&apos;OBS apparaît et chaque bouton agit sur ton PC.
            </li>
          </ol>
          <p className="mt-4 text-xs text-muted">Le live et le stream tournent sur ton ordinateur. Cette page, même sur téléphone, ne fait que commander.</p>
        </section>
      )}

      {link === "on" && devices.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4" aria-label="Appareils">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Ordinateurs reliés à ton compte</h2>
          <ul className="mt-3 divide-y divide-line">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>
                  {d.name}{" "}
                  <span className="text-muted">
                    · {OS[d.platform] ?? d.platform}
                    {d.online ? " · en ligne" : d.last_seen ? ` · vu le ${new Date(d.last_seen).toLocaleDateString("fr-FR")}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await coreFetch(coreUrl, `/v1/me/link/devices/${d.id}`, { method: "DELETE" }).catch(() => null);
                    setTick((n) => n + 1);
                  }}
                  className="rounded-full border border-line px-3 py-1 text-xs hover:bg-accent/10"
                >
                  Révoquer
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
