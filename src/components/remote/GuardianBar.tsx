"use client";

import { useState } from "react";
import type { Guardian } from "./useRemote";
import { btnFlat, Confirm, cx, Icon, type ConfirmAsk } from "./ui";

// Gardien SYXTEE : processus du Mac, séparé d'OBS. Reste en ligne quand OBS plante : bouton pour relancer OBS à distance,
// et deux réglages (surveillance avec relance automatique, reprise du direct).

type Call = <T = Record<string, unknown>>(method: string, params?: Record<string, unknown>) => Promise<T>;
const small = cx(btnFlat, "h-8 px-3.5 text-[13px]");

export function GuardianBar({ guardian, agentOnline, call }: { guardian: Guardian; agentOnline: boolean; call: Call }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ask, setAsk] = useState<ConfirmAsk>(null);
  const s = guardian.status ?? {};

  // Pas de Gardien et OBS hors ligne : on explique comment l'obtenir. Sinon la barre reste discrète.
  if (!guardian.online) {
    if (agentOnline) return null;
    return (
      <p className="mx-2 mt-2 shrink-0 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-muted">
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
  const calm = !s.launching && !s.gaveUp;
  return (
    <div aria-label="Gardien SYXTEE" className="mx-2 mt-2 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px]">
      <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted">
        <Icon name="settings" className="size-3.5" />
        Gardien
      </span>
      <span role="status" className={cx(!calm && "text-warn")}>
        {text}
        {s.awake === true && calm ? " · Mac éveillé" : ""}
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-1.5">
        {!obsOpen ? (
          <button type="button" disabled={busy || s.launching === true} onClick={() => void act("guardian.launchObs")} className={small}>
            Relancer OBS
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setAsk({ title: "Redémarrer OBS ?", text: "OBS se ferme puis se rouvre. Le direct est repris s'il était actif et que la reprise est activée.", ok: "Redémarrer OBS", danger: true, run: () => void act("guardian.restartObs") })}
            className={small}
          >
            Redémarrer OBS
          </button>
        )}
        <button type="button" role="switch" aria-checked={s.watch === true} aria-label="Relance automatique après un plantage" disabled={busy} onClick={() => void act("guardian.setWatch", { enabled: s.watch !== true })} className={cx(small, s.watch === true && "!border-foreground/40 !bg-foreground/15")}>
          Relance auto
        </button>
        <button type="button" role="switch" aria-checked={s.resume === true} aria-label="Reprendre le direct après une relance" disabled={busy} onClick={() => void act("guardian.setResume", { enabled: s.resume !== true })} className={cx(small, s.resume === true && "!border-foreground/40 !bg-foreground/15")}>
          Reprise du direct
        </button>
      </span>
      {error && (
        <span role="alert" className="basis-full text-warn">
          {error}
        </span>
      )}
      <Confirm ask={ask} onClose={() => setAsk(null)} />
    </div>
  );
}
