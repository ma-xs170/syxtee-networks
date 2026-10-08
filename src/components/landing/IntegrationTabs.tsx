"use client";

import { useState } from "react";
import CodeBlock from "../ui/CodeBlock";

// Onglets d'intégration : l'URL à coller dans chaque logiciel. Adresses d'exemple : la vraie URL est dans le dashboard, page Relais.
const TABS = [
  { id: "srtla", label: "SRTLA", title: "Encodeur · SRTLA", code: "Type : SRTLA\nURL : srtla://relais.syxtee-networks.fr:PORT\nIdentifiant : TON_ID_DE_FLUX" },
  { id: "obs", label: "OBS", title: "OBS · Source média", code: "Entrée : srt://relais.syxtee-networks.fr:PORT?streamid=TON_ID\nMise en tampon réseau : 2 s\nReconnexion : activée" },
  { id: "rtmp", label: "RTMP", title: "Encodeur · RTMP", code: "Serveur : rtmp://relais.syxtee-networks.fr/live\nClé de stream : TA_CLE" },
] as const;

export default function IntegrationTabs() {
  const [id, setId] = useState<(typeof TABS)[number]["id"]>("srtla");
  const tab = TABS.find((t) => t.id === id)!;
  return (
    <div>
      <div role="tablist" aria-label="Logiciel" className="flex w-max gap-1 rounded-full border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === id}
            onClick={() => setId(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${t.id === id ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-5" role="tabpanel">
        <CodeBlock code={tab.code} title={tab.title} />
      </div>
      <p className="mt-3 text-xs text-muted">Adresses d&apos;exemple. Ton URL et ton identifiant sont sur la page Relais du dashboard.</p>
    </div>
  );
}
