"use client";

import { useState } from "react";
import type { Guardian } from "./useRemote";

// Gardien SYXTEE : processus du Mac, séparé d'OBS. Reste en ligne quand OBS plante : bouton pour relancer OBS à distance,
// et deux réglages (surveillance avec relance automatique, reprise du direct).

const flat = "inline-flex items-center justify-center whitespace-nowrap rounded-full border border-white/[0.14] bg-[#16161a] text-[13px] text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-[#1e1e23] disabled:opacity-40";

export function GuardianBar({ guardian, agentOnline, call }: { guardian: Guardian; agentOnline: boolean; call: <T = Record<string, unknown>>(method: string, params?: Record<string, unknown>) => Promise<T> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const s = guardian.status ?? {};

  // Pas de Gardien et OBS hors ligne : on explique comment l'obtenir. Sinon la barre reste discrète.
  if (!guardian.online) {
    if (agentOnline) return null;
    return (
      <p className="mx-2 mt-2 shrink-0 rounded-md border border-white/[0.08] bg-[#0b0b0d] px-3 py-1.5 text-[13px] text-neutral-400">
        Gardien SYXTEE absent de ce Mac. Mets à jour le plugin SYXTEE Link (0.8.0 ou plus) pour relancer OBS à distance.
      </p>
    );
  }

  async function act(method: string, params?: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await call(method, params);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const obsOpen = s.obs === true;
  const text = s.launching === true ? "Relance d'OBS en cours…" : s.gaveUp === true ? "OBS a planté 3 fois en 15 minutes : relance automatique suspendue." : obsOpen ? "Gardien actif" : "OBS est fermé sur ce Mac";
  return (
    <div aria-label="Gardien SYXTEE" className="mx-2 mt-2 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-white/[0.08] bg-[#0b0b0d] px-3 py-1.5 text-[13px] text-neutral-300">
      <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">Gardien</span>
      <span role="status">
        {text}
        {s.awake === true && !s.gaveUp && !s.launching ? " · Mac éveillé" : ""}
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-1.5">
        {!obsOpen ? (
          <button type="button" disabled={busy || s.launching === true} onClick={() => void act("guardian.launchObs")} className={`${flat} h-7 px-3.5`}>
            Relancer OBS
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Fermer OBS puis le rouvrir ? Le direct est repris s'il était actif (si la reprise est activée).")) void act("guardian.restartObs");
            }}
            className={`${flat} h-7 px-3.5`}
          >
            Redémarrer OBS
          </button>
        )}
        <button type="button" role="switch" aria-checked={s.watch === true} aria-label="Relance automatique après un plantage" disabled={busy} onClick={() => void act("guardian.setWatch", { enabled: s.watch !== true })} className={`${flat} h-7 px-3.5 ${s.watch === true ? "!border-white/30 !bg-white/[0.14] !text-white" : ""}`}>
          Relance auto
        </button>
        <button type="button" role="switch" aria-checked={s.resume === true} aria-label="Reprendre le direct après une relance" disabled={busy} onClick={() => void act("guardian.setResume", { enabled: s.resume !== true })} className={`${flat} h-7 px-3.5 ${s.resume === true ? "!border-white/30 !bg-white/[0.14] !text-white" : ""}`}>
          Reprise du direct
        </button>
      </span>
      {error && (
        <span role="alert" className="basis-full text-amber-200">
          {error}
        </span>
      )}
    </div>
  );
}
