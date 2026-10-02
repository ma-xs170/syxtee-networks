"use client";

import { useActionState } from "react";
import { createTicketAction, type SupportState } from "@/app/(dashboard)/dashboard/support/actions";

const field = "w-full rounded-xl border border-line bg-surface px-4 text-sm text-foreground placeholder:text-muted focus:border-line-strong focus:outline-none";

export default function NewTicketForm() {
  const [state, action, pending] = useActionState<SupportState, FormData>(createTicketAction, {});
  return (
    <form action={action} className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <label htmlFor="t-subject" className="text-sm font-medium">
          Sujet
        </label>
        <input id="t-subject" name="subject" required minLength={3} maxLength={120} placeholder="Ex. : mon relais ne se connecte pas" className={`${field} h-11`} />
      </div>
      <div className="space-y-2">
        <label htmlFor="t-body" className="text-sm font-medium">
          Ton message
        </label>
        <textarea id="t-body" name="body" required rows={7} maxLength={4000} placeholder="Explique ce qui se passe, ton appareil et ce que tu as déjà essayé." className={`${field} py-3`} />
        <p className="text-xs text-muted">Ne mets jamais ton mot de passe ni tes clés de stream dans un message.</p>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-400/90">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="h-11 whitespace-nowrap rounded-lg bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60">
        {pending ? "Envoi…" : "Envoyer ma demande"}
      </button>
    </form>
  );
}
