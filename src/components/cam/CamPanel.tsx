"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { rotateCamLink, type CamActionState } from "@/app/(dashboard)/dashboard/cam/actions";
import MaskedUrl from "@/components/dashboard/MaskedUrl";
import { useStreamMode } from "@/components/dashboard/streamMode";

// Lien caméra : QR code à scanner avec le téléphone, lien masqué (copiable), régénération avec confirmation.

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-11 rounded-full border border-red-400/40 px-5 text-sm font-medium text-red-300 hover:bg-red-400/10 disabled:opacity-60">
      {pending ? "Un instant…" : "Confirmer"}
    </button>
  );
}

export default function CamPanel({ link, qrSvg }: { link: string; qrSvg: string }) {
  const [state, action] = useActionState<CamActionState, FormData>(rotateCamLink, {});
  const [confirm, setConfirm] = useState(false);
  const streamMode = useStreamMode();

  return (
    <div className="grid gap-6 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start">
      <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-xl bg-white p-3">
        {/* Le QR contient la clé : caché en mode stream (écran partagé en live). */}
        {streamMode ? (
          <p className="flex h-full items-center justify-center text-center text-xs text-black/60">QR masqué en mode stream</p>
        ) : (
          <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        )}
      </div>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted">
          Scanne ce QR code avec l&apos;appareil photo du téléphone qui servira de caméra. La page s&apos;ouvre, autorise la caméra et le micro,
          puis touche « Diffuser ».
        </p>
        <MaskedUrl url={link} label="Lien caméra" />
        <p className="text-xs text-muted">Ce lien donne accès à ta diffusion : ne le partage pas.</p>
        {confirm ? (
          <form action={action} className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">L&apos;ancien lien cessera de marcher.</span>
            <Submit />
            <button type="button" onClick={() => setConfirm(false)} className="h-11 px-3 text-sm text-muted hover:text-foreground">
              Annuler
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="h-11 rounded-full border border-line px-5 text-sm font-medium hover:bg-foreground/10">
            Nouveau lien caméra
          </button>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-red-400/90">
            {state.error}
          </p>
        )}
      </div>
    </div>
  );
}
