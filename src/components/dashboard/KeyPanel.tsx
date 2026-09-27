"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createKeys, rotateKeys, type KeyActionState } from "@/app/(site)/dashboard/actions";
import CopyCode from "@/components/CopyCode";
import type { StreamKeys } from "@/lib/core";

// Tes URLs (Moblin, IRL Pro / SRT, OBS) + « Régénérer ma clé » avec confirmation.

function Submit({ children, variant = "primary" }: { children: string; variant?: "primary" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`h-11 rounded-full px-5 text-sm font-medium transition-colors disabled:opacity-60 ${
        variant === "primary" ? "bg-white text-black hover:bg-neutral-200" : "border border-red-400/40 text-red-300 hover:bg-red-400/10"
      }`}
    >
      {pending ? "Un instant…" : children}
    </button>
  );
}

function Url({ label, hint, url }: { label: string; hint: string; url: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
      <div className="mt-2">
        <CopyCode code={url} />
      </div>
    </div>
  );
}

export function CreateKeys() {
  const [state, action] = useActionState<KeyActionState, FormData>(createKeys, {});
  return (
    <form action={action} className="rounded-2xl border border-dashed border-line p-8">
      <p className="text-sm text-muted">Génère tes clés pour obtenir tes URLs Moblin et OBS personnelles.</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Submit>Générer mes clés</Submit>
        {state.error && <p role="alert" className="text-sm text-red-400/90">{state.error}</p>}
      </div>
    </form>
  );
}

export default function KeyPanel({ keys }: { keys: StreamKeys }) {
  const [state, action] = useActionState<KeyActionState, FormData>(rotateKeys, {});
  const [confirm, setConfirm] = useState(false);

  return (
    <section className="space-y-6" aria-labelledby="urls">
      <div>
        <h2 id="urls" className="text-lg font-medium">Tes URLs</h2>
        <p className="mt-1 text-sm text-muted">
          Relais {keys.relay.name}. Ces URLs contiennent ta clé personnelle : ne les partage pas et ne les montre pas en live.
        </p>
      </div>
      <Url label="Moblin (SRTLA)" hint="Moblin → Réglages → Streams → ton stream → URL." url={keys.moblin_srtla_url} />
      <Url label="IRL Pro, BELABOX ou encodeur SRT" hint="Envoi direct en SRT, sans agrégation de liens." url={keys.srt_publish_url} />
      <Url label="OBS (source Média)" hint="OBS → Source média → décocher « Fichier local » → Entrée." url={keys.obs_srt_url} />

      <div className="border-t border-line pt-6">
        {confirm ? (
          <form action={action} className="space-y-4">
            <p className="text-sm leading-relaxed text-muted">
              Tes URLs actuelles cesseront de fonctionner immédiatement. Tu devras coller les nouvelles dans Moblin et OBS.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Submit variant="danger">Confirmer la régénération</Submit>
              <button type="button" onClick={() => setConfirm(false)} className="h-11 px-4 text-sm text-muted hover:text-foreground">
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="h-11 rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            Régénérer ma clé
          </button>
        )}
        {state.error && (
          <p role="alert" className="mt-3 text-sm text-red-400/90">
            {state.error}
          </p>
        )}
      </div>
    </section>
  );
}
