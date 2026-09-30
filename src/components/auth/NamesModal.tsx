"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveStatus } from "@/components/dashboard/LiveStatus";
import { NamesForm } from "./AccountForms";

// Comptes créés avant l'inscription email + mot de passe : prénom et nom demandés au prochain passage.
// Hors live : modale non fermable (pas d'Échap, pas de clic dehors) ; elle disparaît quand le layout est revalidé.
// Pendant un live : jamais d'écran bloqué, un bandeau « Complète ton profil » ouvre la modale (fermable) à la demande.
export default function NamesModal() {
  const ref = useRef<HTMLDialogElement>(null);
  const { state } = useLiveStatus();
  const onAir = !!(state?.live || state?.reconnecting);
  const [asked, setAsked] = useState(false);
  const open = !onAir || asked;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      {onAir && (
        <div role="region" aria-label="Profil incomplet" className="border-b border-line">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm text-white/70">
              <span className="font-mono text-xs uppercase tracking-wider text-white/45">Profil</span>
              <span className="ml-3">Complète ton profil : prénom et nom.</span>
            </p>
            <button
              type="button"
              onClick={() => setAsked(true)}
              className="h-9 whitespace-nowrap rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
            >
              Compléter mon profil
            </button>
          </div>
        </div>
      )}
      <dialog
        ref={ref}
        aria-labelledby="names-title"
        onCancel={(e) => {
          e.preventDefault();
          if (onAir) setAsked(false); // pendant un live, Échap referme la modale
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 text-white backdrop:bg-black/80 sm:p-8"
      >
        <h2 id="names-title" className="text-xl font-semibold tracking-tight">
          Comment tu t&apos;appelles ?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Ton prénom et ton nom remplacent le pseudo dans ton espace. Ils restent privés : sur le site, on n&apos;affiche que ta chaîne Twitch.
        </p>
        <div className="mt-6">
          <NamesForm first="" last="" submit="Continuer" />
        </div>
        {onAir && (
          <button type="button" onClick={() => setAsked(false)} className="mt-4 text-sm text-white/60 underline-offset-4 hover:text-white hover:underline">
            Plus tard
          </button>
        )}
      </dialog>
    </>
  );
}
