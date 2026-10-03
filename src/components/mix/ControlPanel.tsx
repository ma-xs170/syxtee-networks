"use client";

import { useState } from "react";
import { Camera, Flag, Record, Broadcast, FilmSlate, CaretDown } from "@phosphor-icons/react";
import { tc, type MixRelay } from "@/lib/mix-sim";

// Colonne de droite, fine : DIFFUSION (direct, REC, capture, marqueur, slate) et réglages du relais sélectionné,
// repliés par défaut. Les actions « dangereuses » demandent une confirmation. PROTECTION active : tout est grisé.

export type LiveState = "idle" | "starting" | "live" | "error";

const ctl =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-line px-2.5 text-xs font-medium transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

export default function ControlPanel({ locked, live, liveSeconds, onLive, rec, recSeconds, onRec, slate, onSlate, onShot, onMarker, selected, onRename, onDisconnect, onRegenerate }: {
  locked: boolean;
  live: LiveState;
  liveSeconds: number;
  onLive: () => void;
  rec: boolean;
  recSeconds: number;
  onRec: () => void;
  slate: boolean;
  onSlate: () => void;
  onShot: () => void;
  onMarker: () => void;
  selected: MixRelay | undefined;
  onRename: (name: string) => void;
  onDisconnect: () => void;
  onRegenerate: () => void;
}) {
  const [ask, setAsk] = useState<"live" | "rec" | "disconnect" | "key" | null>(null);
  const [bitrate, setBitrate] = useState("8000");
  const [latency, setLatency] = useState("600");
  const sel = "h-8 w-full rounded-md border border-line bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:opacity-40";

  const confirmBox = (kind: NonNullable<typeof ask>, text: string, go: () => void, yes: string) =>
    ask === kind && (
      <div role="alertdialog" aria-label="Confirmation" className="mt-1.5 rounded-md border border-line-strong bg-background p-2 text-xs">
        <p>{text}</p>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              go();
              setAsk(null);
            }}
            className="h-7 rounded-md bg-accent px-3 text-xs font-medium text-on-accent hover:bg-accent-hover"
          >
            {yes}
          </button>
          <button type="button" onClick={() => setAsk(null)} className={`${ctl} h-7`}>
            Annuler
          </button>
        </div>
      </div>
    );

  return (
    <aside aria-label="Contrôles" className="space-y-2">
      <section className="space-y-2 rounded-xl border border-line bg-surface p-2.5">
        <h2 className="text-xs font-semibold">Diffusion</h2>
        <div>
          <button
            type="button"
            disabled={locked || live === "starting"}
            onClick={() => (live === "live" || live === "idle" || live === "error") && setAsk("live")}
            className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-md font-mono text-xs font-semibold tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40 ${
              live === "live" ? "bg-live text-on-accent" : "border border-live hover:bg-live/15"
            }`}
          >
            <Broadcast size={16} weight="fill" aria-hidden="true" />
            {live === "live" ? `EN DIRECT ${tc(liveSeconds)}` : live === "starting" ? "DÉMARRAGE…" : "LANCER DIRECT"}
          </button>
          {live === "error" && <p role="alert" className="mt-1 text-[11px] text-red-400/90">Le direct n&apos;a pas démarré : destination injoignable.</p>}
          {confirmBox("live", live === "live" ? "Arrêter le direct sur toutes les destinations ?" : "Lancer le direct vers Twitch (compte lié) ?", onLive, live === "live" ? "Arrêter" : "Lancer")}
        </div>
        <div>
          <button type="button" disabled={locked} onClick={() => (rec ? setAsk("rec") : onRec())} className={`${ctl} w-full ${rec ? "border-live" : ""}`}>
            <Record size={14} weight="fill" className={rec ? "text-live" : "text-muted"} aria-hidden="true" />
            {rec ? `REC ${tc(recSeconds)} · ${Math.round(recSeconds * 0.9)} Mo` : "REC"}
          </button>
          {confirmBox("rec", "Arrêter l'enregistrement ?", onRec, "Arrêter")}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button type="button" disabled={locked} onClick={onShot} className={ctl} title="Capture du PROGRAMME">
            <Camera size={14} aria-hidden="true" />
            <span className="sr-only xl:not-sr-only">Capture</span>
          </button>
          <button type="button" disabled={locked} onClick={onMarker} className={ctl} title="Marqueur de clip">
            <Flag size={14} aria-hidden="true" />
            <span className="sr-only xl:not-sr-only">Marqueur</span>
          </button>
          <button type="button" disabled={locked} onClick={onSlate} aria-pressed={slate} className={`${ctl} ${slate ? "border-live bg-live/15" : ""}`} title="Écran BRB / déconnexion">
            <FilmSlate size={14} aria-hidden="true" />
            <span className="sr-only xl:not-sr-only">Slate</span>
          </button>
        </div>
      </section>

      <details className="group rounded-xl border border-line bg-surface">
        <summary className="flex h-9 cursor-pointer list-none items-center justify-between gap-2 px-2.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 [&::-webkit-details-marker]:hidden">
          <span className="truncate">{selected ? `Réglages · CAM ${selected.n}` : "Réglages du relais"}</span>
          <CaretDown size={14} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-2 border-t border-line p-2.5">
          {selected ? (
            <>
              <label className="block space-y-1 text-[11px] text-muted">
                Nom
                <input defaultValue={selected.name} key={selected.id} disabled={locked} maxLength={40} onBlur={(e) => e.target.value.trim() && e.target.value !== selected.name && onRename(e.target.value.trim())} className={sel} />
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <label className="space-y-1 text-[11px] text-muted">
                  Débit max
                  <select className={sel} value={bitrate} disabled={locked} onChange={(e) => setBitrate(e.target.value)}>
                    {["4000", "6000", "8000", "12000"].map((v) => (
                      <option key={v} value={v}>
                        {Number(v).toLocaleString("fr-FR")} kbps
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-[11px] text-muted">
                  Latence SRT
                  <select className={sel} value={latency} disabled={locked} onChange={(e) => setLatency(e.target.value)}>
                    {["300", "600", "1000", "2000"].map((v) => (
                      <option key={v} value={v}>
                        {v} ms
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" disabled={locked} onClick={() => setAsk("disconnect")} className={ctl}>
                  Déconnecter
                </button>
                <button type="button" disabled={locked} onClick={() => setAsk("key")} className={ctl}>
                  Régénérer la clé
                </button>
              </div>
              {confirmBox("disconnect", `Couper CAM ${selected.n} ? Le signal est perdu jusqu'à sa reconnexion.`, onDisconnect, "Déconnecter")}
              {confirmBox("key", "Régénérer la clé ? L'ancienne cesse de fonctionner tout de suite.", onRegenerate, "Régénérer")}
            </>
          ) : (
            <p className="text-xs text-muted">Choisis un relais dans la liste.</p>
          )}
        </div>
      </details>
    </aside>
  );
}
