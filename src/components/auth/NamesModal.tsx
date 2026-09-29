"use client";

import { useEffect, useRef } from "react";
import { NamesForm } from "./AccountForms";

// Comptes créés avant l'inscription email + mot de passe : prénom et nom obligatoires au prochain passage.
// Modale non fermable (pas d'Échap, pas de clic dehors) ; elle disparaît quand le layout est revalidé.
export default function NamesModal() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="names-title"
      onCancel={(e) => e.preventDefault()}
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
    </dialog>
  );
}
