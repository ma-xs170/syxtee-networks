"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Formule Gratuit : le bloc reste visible mais grisé et inutilisable ; un clic ouvre la modale d'upgrade.
// La vraie barrière est côté serveur (actions, API, Core) : ceci n'est que l'interface.

/** Cadenas filaire (charte SYXTEE : traits blancs fins). */
export function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function UpgradeModal({ open, feature, onClose }: { open: boolean; feature?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="upgrade-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 text-white backdrop:bg-black/80 sm:p-8"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white/80">
        <LockIcon />
      </span>
      <h2 id="upgrade-title" className="mt-5 text-xl font-semibold tracking-tight">
        Fonction réservée aux abonnés
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        {feature ? <span className="text-white">{feature}</span> : "Cette fonction"} fait partie des formules payantes. Le Scanner réseau reste gratuit.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard/abonnement" className="flex h-11 items-center justify-center whitespace-nowrap rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-neutral-200">
          Passer à la formule payante
        </Link>
        <Link href="/offres" className="flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/15 px-5 text-sm font-medium transition-colors hover:bg-white/5">
          Voir les offres
        </Link>
      </div>
      <button type="button" onClick={onClose} className="mt-4 text-sm text-white/50 hover:text-white">
        Fermer
      </button>
    </dialog>
  );
}

/** Enveloppe un bloc verrouillé. `locked=false` : rend les enfants tels quels. */
export default function Locked({ locked, feature, children, className = "" }: { locked: boolean; feature?: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!locked) return <>{children}</>;
  return (
    <div className={`relative ${className}`}>
      <div inert aria-hidden="true" className="pointer-events-none select-none opacity-40 grayscale">
        {children}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${feature ?? "Fonction"} : réservé aux abonnés`}
        className="absolute inset-0 cursor-not-allowed rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black text-white/80">
          <LockIcon />
        </span>
      </button>
      <UpgradeModal open={open} feature={feature} onClose={() => setOpen(false)} />
    </div>
  );
}
