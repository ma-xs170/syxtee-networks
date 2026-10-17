"use client";

import { useActionState, useState } from "react";
import { createTicketAction, type SupportState } from "@/app/(dashboard)/dashboard/aide/actions";
import { SUPPORT_CATEGORIES, type SupportCategory } from "@/lib/support-categories";
import PhotoPicker from "./PhotoPicker";

const field = "w-full rounded-xl border border-line bg-surface px-4 text-sm text-foreground placeholder:text-muted focus:border-line-strong focus:outline-none";

// Demande d'assistance en une page : un thème (pastilles), le message, des photos si besoin. Le compte est déjà connu, rien d'autre à remplir.
export default function NewTicketForm() {
  const [state, action, pending] = useActionState<SupportState, FormData>(createTicketAction, {});
  const [category, setCategory] = useState<SupportCategory>("autre");

  return (
    <form action={action} className="max-w-2xl space-y-6">
      <input type="hidden" name="category" value={category} />

      <fieldset>
        <legend className="mb-3 text-sm font-medium">C&apos;est à propos de quoi ?</legend>
        <div className="flex flex-wrap gap-2">
          {SUPPORT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`h-10 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${category === c.id ? "border-foreground bg-foreground text-background" : "border-line text-muted hover:text-foreground"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="t-body" className="text-sm font-medium">Ton message</label>
        <textarea id="t-body" name="body" rows={7} maxLength={3500} required placeholder="Explique ce qui se passe, on te répond ici." className={`${field} py-3`} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Photos <span className="font-normal text-muted">(facultatif)</span></p>
        <PhotoPicker />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="h-11 whitespace-nowrap rounded-full btn-tonal px-6 text-sm font-medium transition-colors disabled:opacity-60">
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}
