"use client";

import { useState, useTransition } from "react";
import { Trash } from "@/components/icons";

// Suppression d'une demande en deux temps (irréversible : messages et photos disparaissent avec elle).
export default function DeleteTicketButton({ action }: { action: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  if (!confirm) {
    return (
      <button type="button" onClick={() => setConfirm(true)} className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-line px-4 text-sm text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
        <Trash size={16} aria-hidden="true" />
        Supprimer
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label="Confirmer la suppression" className="flex flex-wrap items-center gap-2 rounded-lg border border-red-400/50 px-3 py-1.5 text-sm">
      <span>Supprimer pour toujours ?</span>
      <button type="button" disabled={pending} onClick={() => start(() => action())} className="h-8 whitespace-nowrap rounded-md bg-red-600 px-3 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Suppression…" : "Oui, supprimer"}
      </button>
      <button type="button" disabled={pending} onClick={() => setConfirm(false)} className="h-8 rounded-md px-3 text-muted hover:text-foreground">
        Annuler
      </button>
    </div>
  );
}
