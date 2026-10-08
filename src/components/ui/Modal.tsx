"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Fenêtre modale (dialog natif) : Échap et clic dehors ferment. */
export default function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={title} className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-surface p-0 text-foreground backdrop:bg-black/70">
      <div className="p-6">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
