"use client";

import { useEffect, useRef } from "react";
import PlanForms from "./PlanForms";

// Bouton « Modifier » de la carte Formule : ouvre le formulaire (formule, échéance, note, jours offerts) dans une fenêtre.
export default function PlanEditor({ userId, plan, until, note }: { userId: string; plan: string; until: string | null; note: string | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const close = () => d.close();
    d.addEventListener("cancel", close);
    return () => d.removeEventListener("cancel", close);
  }, []);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="mt-auto inline-flex h-9 items-center justify-center self-start rounded-full border border-line-strong px-4 text-sm font-medium transition-colors hover:bg-foreground/[0.08]">
        Modifier
      </button>
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        aria-labelledby="plan-edit-title"
        className="m-auto w-[min(640px,calc(100vw-2rem))] max-h-[92dvh] overflow-y-auto rounded-2xl border border-line-strong bg-background p-0 text-foreground backdrop:bg-background/80 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="plan-edit-title" className="text-lg font-semibold tracking-tight">Modifier la formule</h2>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Fermer" className="-m-2 p-2 text-muted hover:text-foreground">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="mt-5">
            <PlanForms key={`${plan}:${until}`} userId={userId} plan={plan} until={until} note={note} />
          </div>
        </div>
      </dialog>
    </>
  );
}
