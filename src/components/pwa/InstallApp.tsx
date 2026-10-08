"use client";

import Link from "next/link";
import { DeviceMobile, DotsThreeVertical, DownloadSimple, Export, PlusSquare, X } from "@/components/icons";
import { useInstall } from "./useInstall";

// Invitation à mettre SYXTEE sur l'écran d'accueil. Une fois l'app ouverte depuis l'icône, elle disparaît d'elle-même.

const step = "flex items-start gap-3 text-sm leading-snug";
const num = "grid size-6 shrink-0 place-items-center rounded-full border border-line font-mono text-[11px] text-muted";

/** Étapes iPhone / iPad (Safari) : le seul chemin, Apple ne donne aucun bouton d'installation. */
export function IosSteps() {
  return (
    <ol className="grid gap-3">
      <li className={step}>
        <span className={num}>1</span>
        <span>
          Ouvre cette page dans <strong className="font-medium">Safari</strong>, puis touche <Export size={18} className="mx-0.5 inline align-text-bottom" aria-label="Partager" /> Partager.
        </span>
      </li>
      <li className={step}>
        <span className={num}>2</span>
        <span>
          Choisis <PlusSquare size={18} className="mx-0.5 inline align-text-bottom" aria-hidden="true" /> <strong className="font-medium">Sur l&apos;écran d&apos;accueil</strong>.
        </span>
      </li>
      <li className={step}>
        <span className={num}>3</span>
        <span>
          Touche <strong className="font-medium">Ajouter</strong>. L&apos;icône SYXTEE apparaît avec tes autres apps.
        </span>
      </li>
    </ol>
  );
}

/** Étapes Android quand le navigateur ne propose pas le bouton direct. */
export function AndroidSteps() {
  return (
    <ol className="grid gap-3">
      <li className={step}>
        <span className={num}>1</span>
        <span>
          Ouvre cette page dans <strong className="font-medium">Chrome</strong>, puis touche <DotsThreeVertical size={18} weight="bold" className="mx-0.5 inline align-text-bottom" aria-label="Menu" /> en haut à droite.
        </span>
      </li>
      <li className={step}>
        <span className={num}>2</span>
        <span>
          Choisis <strong className="font-medium">Installer l&apos;application</strong> (ou « Ajouter à l&apos;écran d&apos;accueil »).
        </span>
      </li>
      <li className={step}>
        <span className={num}>3</span>
        <span>Confirme. SYXTEE s&apos;ouvre ensuite en plein écran, sans barre d&apos;adresse.</span>
      </li>
    </ol>
  );
}

/** Bandeau du dashboard (mobile) : bouton d'installation direct sur Android, étapes sur iPhone. */
export default function InstallCard({ className = "" }: { className?: string }) {
  const { ready, standalone, platform, touch, dismissed, canPrompt, install, dismiss } = useInstall();
  if (!ready || standalone || dismissed || !(touch || canPrompt)) return null;

  return (
    <aside aria-label="Installer l'application" className={`relative tile p-4 sm:p-5 ${className}`}>
      <button type="button" onClick={dismiss} aria-label="Masquer pour le moment" className="absolute right-2 top-2 grid size-9 place-items-center rounded-lg text-muted hover:bg-foreground/10 hover:text-foreground">
        <X size={16} aria-hidden="true" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line">
          <DeviceMobile size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">Mets SYXTEE sur ton écran d&apos;accueil</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">Un toucher et tu pilotes OBS, en plein écran, comme une vraie app. L&apos;écran reste allumé pendant le direct.</p>
        </div>
      </div>
      <div className="mt-4">
        {canPrompt ? (
          <button type="button" onClick={() => void install()} className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98] motion-reduce:active:scale-100">
            <DownloadSimple size={18} aria-hidden="true" />
            Installer l&apos;app
          </button>
        ) : platform === "ios" ? (
          <IosSteps />
        ) : platform === "android" ? (
          <AndroidSteps />
        ) : (
          <Link href="/application" className="text-sm text-foreground underline underline-offset-4">
            Voir comment faire
          </Link>
        )}
      </div>
    </aside>
  );
}
