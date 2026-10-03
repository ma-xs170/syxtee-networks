"use client";

import { useState } from "react";
import { Camera, Flag, Record, Broadcast, FilmSlate } from "@phosphor-icons/react";
import { ctl } from "./parts";
import { tc, type MixRelay } from "@/lib/mix-sim";

// Colonne de droite : DIRECT, REC, outils (capture, marqueur, slate), puis réglages du relais sélectionné.
// Les actions « dangereuses » demandent une confirmation. PROTECTION active : tout est grisé.

export type LiveState = "idle" | "starting" | "live" | "error";

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
  const sel = "h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:opacity-40";
  const sizeMb = Math.round(recSeconds * 0.9);

  const confirmBox = (kind: NonNullable<typeof ask>, text: string, go: () => void, yes: string) =>
    ask === kind && (
      <div role="alertdialog" aria-label="Confirmation" className="mt-2 rounded-lg border border-line-strong bg-background p-3 text-sm">
        <p className="text-foreground">{text}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              go();
              setAsk(null);
            }}
            className="h-9 rounded-lg bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            {yes}
          </button>
          <button type="button" onClick={() => setAsk(null)} className={`${ctl} h-9 min-h-9`}>
            Annuler
          </button>
        </div>
      </div>
    );

  return (
    <aside aria-label="Contrôles" className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Diffusion</h2>
        <div className="mt-3 space-y-3">
          <div>
            <button
              type="button"
              disabled={locked || live === "starting"}
              onClick={() => (live === "live" ? setAsk("live") : live === "idle" || live === "error" ? setAsk("live") : undefined)}
              className={`inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl font-mono text-sm font-semibold tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40 ${
                live === "live" ? "bg-live text-on-accent" : "border border-live text-foreground hover:bg-live/15"
              }`}
            >
              <Broadcast size={20} weight="fill" aria-hidden="true" />
              {live === "live" ? `EN DIRECT ${tc(liveSeconds)}` : live === "starting" ? "DÉMARRAGE…" : "LANCER DIRECT"}
            </button>
            {live === "error" && <p role="alert" className="mt-2 text-xs text-red-400/90">Le direct n&apos;a pas démarré : destination injoignable.</p>}
            {confirmBox("live", live === "live" ? "Arrêter le direct sur toutes les destinations ?" : "Lancer le direct vers Twitch (compte lié) ?", onLive, live === "live" ? "Arrêter" : "Lancer")}
          </div>

          <div>
            <button type="button" disabled={locked} onClick={() => (rec ? setAsk("rec") : onRec())} className={`${ctl} h-11 w-full ${rec ? "border-live text-foreground" : ""}`}>
              <Record size={18} weight="fill" className={rec ? "text-live" : "text-muted"} aria-hidden="true" />
              {rec ? "REC · arrêter" : "REC"}
            </button>
            {rec && (
              <p className="mt-2 font-mono text-xs tabular-nums text-muted">
                {tc(recSeconds)} · {sizeMb} Mo · PROGRAM + ISO
              </p>
            )}
            {confirmBox("rec", "Arrêter l'enregistrement ?", onRec, "Arrêter")}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button type="button" disabled={locked} onClick={onShot} className={ctl} title="Capture du PROGRAM">
              <Camera size={18} aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Capture</span>
            </button>
            <button type="button" disabled={locked} onClick={onMarker} className={ctl} title="Marqueur de clip">
              <Flag size={18} aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Marqueur</span>
            </button>
            <button type="button" disabled={locked} onClick={onSlate} aria-pressed={slate} className={`${ctl} ${slate ? "border-live bg-live/15" : ""}`} title="Écran BRB / déconnexion">
              <FilmSlate size={18} aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Slate</span>
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">{selected ? `CAM ${selected.n} · ${selected.name}` : "Relais sélectionné"}</h2>
        {selected ? (
          <div className="mt-3 space-y-3">
            <label className="block space-y-1.5 text-xs text-muted">
              Nom
              <input defaultValue={selected.name} key={selected.id} disabled={locked} maxLength={40} onBlur={(e) => e.target.value.trim() && e.target.value !== selected.name && onRename(e.target.value.trim())} className={sel} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1.5 text-xs text-muted">
                Débit max
                <select className={sel} value={bitrate} disabled={locked} onChange={(e) => setBitrate(e.target.value)}>
                  {["4000", "6000", "8000", "12000"].map((v) => (
                    <option key={v} value={v}>
                      {Number(v).toLocaleString("fr-FR")} kbps
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs text-muted">
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
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={locked} onClick={() => setAsk("disconnect")} className={ctl}>
                Déconnecter
              </button>
              <button type="button" disabled={locked} onClick={() => setAsk("key")} className={ctl}>
                Régénérer la clé
              </button>
            </div>
            {confirmBox("disconnect", `Couper CAM ${selected.n} ? Le signal est perdu jusqu'à sa reconnexion.`, onDisconnect, "Déconnecter")}
            {confirmBox("key", "Régénérer la clé ? L'ancienne cesse de fonctionner tout de suite.", onRegenerate, "Régénérer")}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Clique sur une caméra pour régler son relais.</p>
        )}
      </section>
    </aside>
  );
}
