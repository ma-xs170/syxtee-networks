"use client";

import { useActionState } from "react";
import { sendNotificationAction, type NotifState } from "./actions";

const field = "w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const label = "text-xs text-muted";

export default function NotifForm() {
  const [state, action, pending] = useActionState<NotifState, FormData>(sendNotificationAction, {});
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="n-title" className={label}>Titre</label>
        <input id="n-title" name="title" required maxLength={80} className={`${field} h-11`} />
      </div>
      <div className="space-y-2">
        <label htmlFor="n-body" className={label}>Message</label>
        <textarea id="n-body" name="body" rows={4} maxLength={500} className={`${field} py-3`} />
      </div>
      <div className="space-y-2">
        <label htmlFor="n-to" className={label}>Destinataire</label>
        <input id="n-to" name="supportId" placeholder="ID support (vide = tous les comptes)" className={`${field} h-11`} />
      </div>
      {state.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-muted">{state.ok}</p>}
      <button type="submit" disabled={pending} className="h-11 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60">
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}
