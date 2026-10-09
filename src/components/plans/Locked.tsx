"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// Formule Gratuit : le bloc reste visible mais flouté et inutilisable, avec une carte « Voir les forfaits ».
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

/** Carte posée sur un bloc verrouillé. */
export function UpgradeCard({ feature }: { feature?: string }) {
  return (
    <div role="region" aria-label={`${feature ?? "Fonction"} : disponible avec un forfait`} className="w-full max-w-md rounded-2xl border border-line-strong bg-surface p-6 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] sm:p-8">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-line-strong text-muted">
        <LockIcon className="h-5 w-5" />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">Disponible avec un forfait</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {feature ? <span className="text-foreground">{feature}</span> : "Cette fonction"} s&apos;ouvre avec un abonnement. Les services ne sont pas encore ouverts à tous : ton compte gratuit donne accès à la documentation et au support, où tu peux demander un accès.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/tarifs" className="flex h-11 items-center justify-center whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium transition-colors">
          Voir les forfaits
        </Link>
        <Link href="/dashboard/support" className="flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-line-strong px-5 text-sm font-medium transition-colors hover:bg-fill-hover">
          Demander un accès
        </Link>
      </div>
      <Link href="/docs" className="mt-4 inline-block text-sm text-muted hover:text-foreground">Lire la documentation</Link>
    </div>
  );
}

/** Enveloppe un bloc verrouillé. `locked=false` : rend les enfants tels quels. */
export default function Locked({ locked, feature, children, className = "" }: { locked: boolean; feature?: string; children: ReactNode; className?: string }) {
  if (!locked) return <>{children}</>;
  return (
    <div className={`relative ${className}`}>
      <div inert aria-hidden="true" className="pointer-events-none max-h-[calc(100dvh-8rem)] select-none overflow-hidden opacity-60 blur-[6px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center px-2 pt-10 sm:pt-16">
        <UpgradeCard feature={feature} />
      </div>
    </div>
  );
}
