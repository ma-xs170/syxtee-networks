"use client";

import { useState } from "react";
import { DownloadSimple } from "@/components/icons";
import { AndroidSteps, IosSteps } from "./InstallApp";
import { useInstall, type Platform } from "./useInstall";

// Guide de la page /application : bouton d'installation direct quand le navigateur le permet, sinon les étapes de l'appareil
// (celui qu'on utilise est choisi d'emblée ; l'autre reste à un toucher).

const TABS: { id: Exclude<Platform, "other">; label: string }[] = [
  { id: "ios", label: "iPhone et iPad" },
  { id: "android", label: "Android" },
];

export default function InstallGuide() {
  const { ready, standalone, platform, canPrompt, install } = useInstall();
  const [picked, setPicked] = useState<Exclude<Platform, "other"> | null>(null);
  const current = picked ?? (platform === "android" ? "android" : "ios");

  if (ready && standalone)
    return (
      <p role="status" className="tile p-5 text-sm">
        SYXTEE est déjà sur ton écran d&apos;accueil. Tu peux fermer cette page.
      </p>
    );

  return (
    <div className="tile p-5 sm:p-6">
      {canPrompt && (
        <div className="mb-6 border-b border-line pb-6">
          <button type="button" onClick={() => void install()} className="btn btn-primary">
            <DownloadSimple size={18} aria-hidden="true" />
            Installer l&apos;app
          </button>
          <p className="mt-3 text-sm text-muted">Ton navigateur propose l&apos;installation directe : un seul bouton.</p>
        </div>
      )}
      <div role="tablist" aria-label="Appareil" className="inline-flex gap-1 rounded-full border border-line p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={current === t.id}
            onClick={() => setPicked(t.id)}
            className={`min-h-9 whitespace-nowrap rounded-full px-4 text-sm transition-colors ${current === t.id ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6" role="tabpanel">
        {current === "ios" ? <IosSteps /> : <AndroidSteps />}
      </div>
    </div>
  );
}
