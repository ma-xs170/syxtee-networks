"use client";

import { useActionState } from "react";
import { inviteAffiliateAction, type AffiliateState } from "./actions";

const input = "h-11 w-full rounded-lg border border-line bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";

export default function InviteAffiliate() {
  const [state, action, pending] = useActionState<AffiliateState, FormData>(inviteAffiliateAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor="aff-email" className="mb-2 block text-sm">E-mail du compte</label>
        <input id="aff-email" name="email" type="email" required placeholder="streamer@exemple.fr" className={input} />
      </div>
      <div>
        <label htmlFor="aff-pseudo" className="mb-2 block text-sm">Pseudo <span className="text-muted">(facultatif)</span></label>
        <input id="aff-pseudo" name="pseudo" maxLength={40} placeholder="Jonk_a" className={input} />
      </div>
      <div>
        <label htmlFor="aff-slug" className="mb-2 block text-sm">Nom d&apos;URL <span className="text-muted">(facultatif)</span></label>
        <input id="aff-slug" name="slug" maxLength={30} placeholder="jonk_a" className={`${input} font-mono`} />
      </div>
      <button type="submit" disabled={pending} className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg btn-tonal px-5 text-sm font-medium disabled:opacity-50">
        {pending ? "Envoi…" : "Envoyer l'invitation"}
      </button>
      {state.error && <p role="alert" className="text-sm text-bad sm:col-span-4">{state.error}</p>}
      {state.ok && <p role="status" className="break-all text-sm text-ok sm:col-span-4">{state.ok}</p>}
    </form>
  );
}
