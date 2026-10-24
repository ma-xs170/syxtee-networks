"use client";

import { useActionState } from "react";
import { contactAction, type ContactState } from "../actions";

const field = "mt-2 h-11 w-full rounded-xl border border-line bg-background px-4 text-sm focus:border-foreground/70 focus:outline-none";

export default function ContactForm({ cardId }: { cardId: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(contactAction, {});
  if (state.ok) return <p role="status" className="text-sm text-ok">{state.ok}</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cardId" value={cardId} />
      {/* Piège à robots : caché pour les humains, jamais rempli par eux. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <label className="block text-sm">Ton nom<input name="name" required minLength={2} maxLength={80} autoComplete="name" className={field} /></label>
      <label className="block text-sm">Ton e-mail<input name="email" type="email" required maxLength={160} autoComplete="email" className={field} /></label>
      <label className="block text-sm">Ton message <span className="text-muted">(date, lieu, besoin)</span>
        <textarea name="message" required minLength={20} maxLength={1500} rows={6} className="mt-2 w-full rounded-xl border border-line bg-background p-4 text-sm focus:border-foreground/70 focus:outline-none" />
      </label>
      {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="h-11 w-full whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium disabled:opacity-60">{pending ? "Envoi…" : "Envoyer le message"}</button>
    </form>
  );
}
