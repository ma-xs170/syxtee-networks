"use client";

import { useState } from "react";
import type { MixRelay } from "@/lib/mix-sim";

// Réglages d'un relais (tiroir) : nom, débit max, latence SRT, déconnecter, régénérer la clé. Confirmation avant les actions
// qui coupent ou invalident quelque chose. PROTECTION active : tout est grisé. Champs à 16 px minimum sur mobile (pas de zoom).

const ctl = "inline-flex h-10 items-center justify-center rounded-md border border-line px-3 text-sm font-medium transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40";
const field = "h-10 w-full rounded-md border border-line bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:opacity-40 lg:text-sm";

export default function RelaySettings({ relay, locked, onRename, onDisconnect, onRegenerate }: { relay: MixRelay; locked: boolean; onRename: (n: string) => void; onDisconnect: () => void; onRegenerate: () => void }) {
  const [ask, setAsk] = useState<"disconnect" | "key" | null>(null);
  const [bitrate, setBitrate] = useState("8000");
  const [latency, setLatency] = useState("600");
  const box = (kind: "disconnect" | "key", text: string, go: () => void, yes: string) =>
    ask === kind && (
      <div role="alertdialog" aria-label="Confirmation" className="rounded-md border border-line-strong bg-background p-3 text-sm">
        <p>{text}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => { go(); setAsk(null); }} className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover">{yes}</button>
          <button type="button" onClick={() => setAsk(null)} className={ctl}>Annuler</button>
        </div>
      </div>
    );
  return (
    <div className="space-y-4">
      <label className="block space-y-1.5 text-xs text-muted">
        Nom
        <input defaultValue={relay.name} key={relay.id} disabled={locked} maxLength={40} onBlur={(e) => e.target.value.trim() && e.target.value !== relay.name && onRename(e.target.value.trim())} className={field} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1.5 text-xs text-muted">
          Débit max
          <select className={field} value={bitrate} disabled={locked} onChange={(e) => setBitrate(e.target.value)}>
            {["4000", "6000", "8000", "12000"].map((v) => <option key={v} value={v}>{Number(v).toLocaleString("fr-FR")} kbps</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs text-muted">
          Latence SRT
          <select className={field} value={latency} disabled={locked} onChange={(e) => setLatency(e.target.value)}>
            {["300", "600", "1000", "2000"].map((v) => <option key={v} value={v}>{v} ms</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={locked} onClick={() => setAsk("disconnect")} className={ctl}>Déconnecter</button>
        <button type="button" disabled={locked} onClick={() => setAsk("key")} className={ctl}>Régénérer la clé</button>
      </div>
      {box("disconnect", `Couper CAM ${relay.n} ? Le signal est perdu jusqu'à sa reconnexion.`, onDisconnect, "Déconnecter")}
      {box("key", "Régénérer la clé ? L'ancienne cesse de fonctionner tout de suite.", onRegenerate, "Régénérer")}
    </div>
  );
}
