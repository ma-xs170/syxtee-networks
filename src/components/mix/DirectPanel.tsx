"use client";

import { useEffect, useState } from "react";
import { Camera, Flag, Record, Broadcast, FilmSlate } from "@phosphor-icons/react";
import { tc } from "@/lib/mix-sim";

// Diffusion : LANCER DIRECT, REC, Capture, Marqueur, Slate. LANCER DIRECT et REC demandent une double validation : un premier
// appui arme le bouton (« Confirmer ? », 3 s), le second valide. Fonctionne pareil au doigt qu'à la souris. PROTECTION : grisé.

export type LiveState = "idle" | "starting" | "live" | "error";

function useArm() {
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return [armed, setArmed] as const;
}

export default function DirectPanel({ locked, live, liveSeconds, onLive, rec, recSeconds, onRec, slate, onSlate, onShot, onMarker, big = false }: {
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
  big?: boolean;
}) {
  const [armed, setArmed] = useArm();
  const h = big ? "h-14 text-base" : "h-8 text-xs";
  const small = `${big ? "h-14 text-sm" : "h-8 text-xs"} inline-flex items-center justify-center gap-1.5 rounded-md border border-line px-2 font-medium transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40`;
  const press = (key: string, go: () => void) => () => (armed === key ? (setArmed(null), go()) : setArmed(key));

  return (
    <section aria-label="Diffusion" className={`flex flex-col gap-1.5 ${big ? "gap-3" : ""}`}>
      <button
        type="button"
        disabled={locked || live === "starting"}
        onClick={press("live", onLive)}
        className={`${h} inline-flex items-center justify-center gap-2 rounded-md font-mono font-semibold tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40 ${
          armed === "live" ? "bg-accent text-on-accent" : live === "live" ? "bg-live text-on-accent" : "border border-live hover:bg-live/15"
        }`}
      >
        <Broadcast size={big ? 20 : 15} weight="fill" aria-hidden="true" />
        {armed === "live" ? (live === "live" ? "ARRÊTER ? APPUIE ENCORE" : "CONFIRMER ? APPUIE ENCORE") : live === "live" ? `EN DIRECT ${tc(liveSeconds)}` : live === "starting" ? "DÉMARRAGE…" : "LANCER DIRECT"}
      </button>
      {live === "error" && <p role="alert" className="text-[11px] text-red-400/90">Le direct n&apos;a pas démarré : destination injoignable.</p>}
      <button type="button" disabled={locked} onClick={press("rec", onRec)} className={`${small} ${armed === "rec" ? "border-transparent bg-accent text-on-accent hover:bg-accent-hover" : rec ? "border-live" : ""}`}>
        <Record size={big ? 20 : 14} weight="fill" className={rec ? "text-live" : "text-muted"} aria-hidden="true" />
        {armed === "rec" ? (rec ? "ARRÊTER ? APPUIE ENCORE" : "REC ? APPUIE ENCORE") : rec ? `REC ${tc(recSeconds)} · ${Math.round(recSeconds * 0.9)} Mo` : "REC"}
      </button>
      <div className="grid grid-cols-3 gap-1.5">
        <button type="button" disabled={locked} onClick={onShot} className={small} title="Capture du PROGRAMME">
          <Camera size={big ? 20 : 14} aria-hidden="true" />
          <span className={big ? "" : "sr-only xl:not-sr-only"}>Capture</span>
        </button>
        <button type="button" disabled={locked} onClick={onMarker} className={small} title="Marqueur de clip">
          <Flag size={big ? 20 : 14} aria-hidden="true" />
          <span className={big ? "" : "sr-only xl:not-sr-only"}>Marqueur</span>
        </button>
        <button type="button" disabled={locked} onClick={onSlate} aria-pressed={slate} className={`${small} ${slate ? "border-live bg-live/15" : ""}`} title="Écran BRB / déconnexion">
          <FilmSlate size={big ? 20 : 14} aria-hidden="true" />
          <span className={big ? "" : "sr-only xl:not-sr-only"}>Slate</span>
        </button>
      </div>
    </section>
  );
}
