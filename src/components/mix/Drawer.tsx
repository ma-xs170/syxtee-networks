"use client";

import { useEffect, useRef } from "react";
import { X } from "@/components/icons";

// Tiroir latéral (Lien OBS, réglages d'un relais) : Échap ou clic à côté pour fermer, le focus entre dans le tiroir.
export default function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    box.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-background/70" onClick={onClose} />
      <div ref={box} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-[min(24rem,100vw)] flex-col border-l border-line bg-surface pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] focus:outline-none">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-foreground/10 hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
