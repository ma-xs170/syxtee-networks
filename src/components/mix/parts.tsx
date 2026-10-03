"use client";

import { useEffect, useRef, type ComponentType } from "react";
import { useReducedMotion } from "motion/react";
import BeachView from "../illustrations/BeachView";
import PhoneMoblin from "../illustrations/PhoneMoblin";
import Streamer from "../illustrations/Streamer";
import StreamerDesk from "../illustrations/StreamerDesk";
import HeroStreet from "../home/HeroStreet";
import RelayServer from "../illustrations/RelayServer";
import { StreamCanvas } from "./streams";
import TestPattern from "./TestPattern";
import { isOn, type MixRelay, type RelayStatus } from "@/lib/mix-sim";

// Briques communes de SYXTEE MIX : image simulée d'une caméra, VU-mètre, pastille d'état.

type Art = ComponentType<{ className?: string; animated?: boolean }>;
const SCENES: Record<MixRelay["scene"], Art> = {
  street: HeroStreet as Art,
  desk: StreamerDesk,
  phone: PhoneMoblin,
  beach: BeachView,
  streamer: Streamer,
  home: RelayServer,
};

/**
 * Image d'une caméra. Hors ligne : mire fictive locale. Relais réel en ligne : sa vidéo partagée du registre (StreamCanvas), avec la
 * mire dessous tant qu'aucune image n'est arrivée (jamais d'écran noir ni de texte de chargement). Démonstration : l'illustration.
 */
export function Feed({ relay, className = "", compact = false }: { relay: MixRelay; className?: string; compact?: boolean }) {
  const Scene = SCENES[relay.scene];
  const label = `CAM ${relay.n} - ${relay.name.toUpperCase()}`;
  return (
    <div className={`overflow-hidden bg-background ${className || "relative"}`}>
      {!isOn(relay) ? (
        <TestPattern label={label} compact={compact} />
      ) : relay.real ? (
        <>
          <TestPattern label={label} compact={compact} />
          <StreamCanvas relayId={relay.id} thumb={compact} />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <Scene animated={false} className="h-full w-full" />
        </div>
      )}
    </div>
  );
}

/** Écran de repli, comme une régie de télévision. */
export function Slate({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface-2 text-center">
      <div aria-hidden="true" className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(0deg,transparent_0_3px,color-mix(in_srgb,var(--foreground)_10%,transparent)_3px_4px)]" />
      <p className="relative font-mono text-xs font-semibold tracking-[0.2em] text-foreground sm:text-sm">{label}</p>
      {sub && <p className="relative font-mono text-[10px] tracking-[0.14em] text-muted">{sub}</p>}
    </div>
  );
}

const STATUS: Record<RelayStatus, { label: string; dot: string; text: string }> = {
  live: { label: "EN DIRECT", dot: "bg-live", text: "text-foreground" },
  online: { label: "EN LIGNE", dot: "bg-emerald-500", text: "text-foreground" },
  unstable: { label: "INSTABLE", dot: "bg-orange-400", text: "text-orange-300" },
  offline: { label: "HORS LIGNE", dot: "border border-muted", text: "text-muted" },
};

export function StatusPill({ status }: { status: RelayStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.12em] ${s.text}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.dot} ${status === "live" ? "animate-pulse motion-reduce:animate-none" : ""}`} />
      {s.label}
    </span>
  );
}

/**
 * VU-mètre stéréo (deux barres), animé hors de React : une boucle d'animation écrit directement la hauteur des barres.
 * `active` faux (hors ligne, muet) : retombe à zéro. `horizontal` pour les tuiles, vertical pour le mixeur.
 */
export function Vu({ active, level = 0.6, vertical = false, className = "" }: { active: boolean; level?: number; vertical?: boolean; className?: string }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const reduce = useReducedMotion();
  useEffect(() => {
    let raf = 0;
    let v = [0, 0];
    const draw = () => {
      v = v.map((cur, i) => {
        const target = active ? Math.min(1, Math.max(0.05, level * (0.55 + Math.random() * 0.55) + (i ? 0.02 : 0))) : 0;
        // Montée rapide, retombée lente, comme un vrai crête-mètre.
        return target > cur ? target : cur - (cur - target) * 0.12;
      });
      v.forEach((x, i) => {
        const el = bars.current[i];
        if (el) el.style[vertical ? "height" : "width"] = `${Math.round(x * 100)}%`;
      });
      raf = requestAnimationFrame(draw);
    };
    if (reduce) {
      v.forEach((_, i) => {
        const el = bars.current[i];
        if (el) el.style[vertical ? "height" : "width"] = active ? `${Math.round(level * 100)}%` : "0%";
      });
      return;
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, level, vertical, reduce]);

  const track = vertical ? "relative h-full w-1.5 overflow-hidden rounded-full bg-foreground/15" : "relative h-1 w-full overflow-hidden rounded-full bg-foreground/15";
  const fill = vertical
    ? "absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-emerald-500 via-emerald-400 to-orange-400"
    : "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-orange-400";
  return (
    <div className={`${vertical ? "flex h-full gap-1" : "flex flex-col gap-1"} ${className}`} role="img" aria-label={active ? "Niveau audio" : "Pas de signal audio"}>
      {[0, 1].map((i) => (
        <span key={i} className={track}>
          <span
            ref={(el) => {
              bars.current[i] = el;
            }}
            className={fill}
            style={vertical ? { height: "0%" } : { width: "0%" }}
          />
        </span>
      ))}
    </div>
  );
}

/** Bouton de commande de la régie : désactivé quand la PROTECTION est active. */
export const ctl =
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-line px-3.5 text-sm font-medium transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
