"use client";

import { useState, useTransition } from "react";
import { shareLiveAction } from "@/app/(dashboard)/dashboard/lives/[id]/actions";

// Partager le rapport d'un direct : crée un lien public (sans compte, sans clé, sans nom de relais), qu'on peut couper à tout moment.

export default function ShareReport({ id, initialToken, origin }: { id: string; initialToken: string | null; origin: string }) {
  const [token, setToken] = useState(initialToken);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const link = token ? `${origin}/direct/${token}` : "";

  function toggle(on: boolean) {
    setError(null);
    start(async () => {
      const r = await shareLiveAction(id, on);
      if (r.error) return setError(r.error);
      setToken(r.token ?? null);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const btn = "h-10 whitespace-nowrap rounded-full border border-line px-4 text-sm transition-colors hover:bg-foreground/10 disabled:opacity-50";
  return (
    <div>
      {token ? (
        <>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-background">
            <code className="min-w-0 flex-1 break-all p-3 font-mono text-xs">{link}</code>
            <button type="button" onClick={copy} className="shrink-0 border-l border-line px-3 text-xs text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
              <span aria-live="polite">{copied ? "Copié" : "Copier"}</span>
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">Toute personne qui a ce lien voit la durée, le débit, les coupures et la courbe. Ni ton nom, ni ton relais, ni tes clés.</p>
          <button type="button" onClick={() => toggle(false)} disabled={pending} className={`${btn} mt-4`}>
            {pending ? "Un instant…" : "Arrêter le partage"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted">Crée un lien public vers le résumé de ce direct : durée, débit, coupures et note de stabilité. Tu peux le couper quand tu veux.</p>
          <button type="button" onClick={() => toggle(true)} disabled={pending} className={`${btn} mt-4`}>
            {pending ? "Un instant…" : "Créer le lien de partage"}
          </button>
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
