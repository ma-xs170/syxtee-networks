"use client";

import { useState, useTransition } from "react";
import { changeModeAction } from "@/app/(dashboard)/dashboard/relais/actions";

// Choix du mode de sortie d'un relais : Direct (OBS lit l'encodeur) ou Régie (mire automatique pendant les coupures).
export default function ModeSwitch({ relayId, mode, available }: { relayId: string; mode: "direct" | "regie"; available: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const options = [
    { id: "direct" as const, label: "Direct", desc: "OBS reçoit ton téléphone tel quel. Écran noir si tu coupes." },
    { id: "regie" as const, label: "Régie", desc: "La mire SYXTEE prend le relais en 1,5 s si ton téléphone coupe." },
  ];
  return (
    <div>
      <div role="radiogroup" aria-label="Mode de sortie" className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const disabled = pending || (o.id === "regie" && !available);
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={mode === o.id}
              disabled={disabled}
              onClick={() =>
                mode !== o.id &&
                start(async () => {
                  const r = await changeModeAction(relayId, o.id);
                  setError(r.error ?? null);
                })
              }
              className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                mode === o.id ? "border-white bg-white/[0.04]" : "border-line hover:bg-white/5"
              }`}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-medium">
                {o.label}
                {o.id === "regie" && !available && <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Bientôt</span>}
              </span>
              <span className="mt-1 block text-sm text-muted">{o.desc}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400/90">
          {error}
        </p>
      )}
    </div>
  );
}
