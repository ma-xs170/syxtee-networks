"use client";

import { useActionState } from "react";
import { addChannelAction, type ChannelState } from "./actions";

export default function AddChannel() {
  const [state, action, pending] = useActionState<ChannelState, FormData>(addChannelAction, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <div>
        <label htmlFor="channel-link" className="mb-2 block text-sm">Lien de la chaîne</label>
        <input id="channel-link" name="link" required placeholder="https://www.twitch.tv/jonk_a" className="h-11 w-full rounded-lg border border-line bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60" />
      </div>
      <button type="submit" disabled={pending} className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg btn-tonal px-5 text-sm font-medium disabled:opacity-50">
        {pending ? "Ajout…" : "Ajouter à l'accueil"}
      </button>
      {state.error && <p role="alert" className="text-sm text-bad sm:col-span-2">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-ok sm:col-span-2">{state.ok}</p>}
    </form>
  );
}
