"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { sendMessageAction, type PlanState } from "./actions";

const field = "w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";

function Send() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-11 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60">
      {pending ? "Envoi…" : "Envoyer le message"}
    </button>
  );
}

// Bouton « Envoyer un message » : fenêtre avec objet et message, envoyés au client par e-mail.
export default function MessageButton({ userId, email }: { userId: string; email: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState<PlanState, FormData>(sendMessageAction, {});
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="mt-auto inline-flex h-9 items-center justify-center self-start rounded-full border border-line-strong px-4 text-sm font-medium transition-colors hover:bg-foreground/[0.08]">
        Envoyer un message
      </button>
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        aria-labelledby="msg-title"
        className="m-auto w-[min(600px,calc(100vw-2rem))] max-h-[92dvh] overflow-y-auto rounded-2xl border border-line-strong bg-background p-0 text-foreground backdrop:bg-background/80 backdrop:backdrop-blur-sm"
      >
        <form action={action} className="grid gap-4 p-6">
          <input type="hidden" name="userId" value={userId} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="msg-title" className="text-lg font-semibold tracking-tight">Envoyer un message</h2>
              <p className="mt-1 text-sm text-muted">Par e-mail, à <span data-sensitive className="text-foreground">{email}</span>.</p>
            </div>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Fermer" className="-m-2 p-2 text-muted hover:text-foreground">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <label className="grid gap-2 text-xs text-muted">
            Objet
            <input name="subject" required minLength={3} maxLength={120} className={`${field} h-11`} />
          </label>
          <label className="grid gap-2 text-xs text-muted">
            Message
            <textarea name="body" required minLength={5} maxLength={4000} rows={7} className={`${field} py-3`} />
          </label>
          {state.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
          {state.ok && <p role="status" className="text-sm text-muted">{state.ok}</p>}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => ref.current?.close()} className="h-11 rounded-full border border-line px-5 text-sm hover:bg-foreground/[0.08]">Fermer</button>
            <Send />
          </div>
        </form>
      </dialog>
    </>
  );
}
