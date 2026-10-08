"use client";

import { useActionState } from "react";
import { createTicketAction, type SupportState } from "@/app/(dashboard)/dashboard/support/actions";
import { SUPPORT_CATEGORIES } from "@/lib/support-categories";
import PhotoPicker from "./PhotoPicker";

const field = "w-full rounded-xl border border-line bg-surface px-4 text-sm text-foreground placeholder:text-muted focus:border-line-strong focus:outline-none";

export default function NewTicketForm() {
  const [state, action, pending] = useActionState<SupportState, FormData>(createTicketAction, {});
  return (
    <form action={action} className="max-w-3xl space-y-8">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">1. Choisis une catégorie</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPORT_CATEGORIES.map((c) => (
            <label key={c.id} className="group relative cursor-pointer">
              <input type="radio" name="category" value={c.id} required className="peer sr-only" />
              <span className="block h-full rounded-xl border border-line bg-surface p-4 transition-colors hover:bg-foreground/[0.04] peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/40">
                <span className="block text-sm font-medium">{c.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">{c.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-5">
        <p className="text-sm font-medium">2. Décris ta demande</p>
        <div className="space-y-2">
          <label htmlFor="t-subject" className="text-sm text-muted">
            Sujet
          </label>
          <input id="t-subject" name="subject" required minLength={3} maxLength={120} placeholder="Ex. : mon relais ne se connecte pas" className={`${field} h-11`} />
        </div>
        <div className="space-y-2">
          <label htmlFor="t-body" className="text-sm text-muted">
            Ton message
          </label>
          <textarea id="t-body" name="body" rows={7} maxLength={4000} placeholder="Explique ce qui se passe, ton appareil et ce que tu as déjà essayé." className={`${field} py-3`} />
          <p className="text-xs text-muted">Ne mets jamais ton mot de passe ni tes clés de stream dans un message ou une photo.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted">Photos (captures d&apos;écran, réglages)</p>
          <PhotoPicker />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="h-11 whitespace-nowrap rounded-lg bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60">
        {pending ? "Envoi…" : "Envoyer ma demande"}
      </button>
    </form>
  );
}
