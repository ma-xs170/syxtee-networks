"use client";

import { useActionState, useState } from "react";
import { type BotState, postServicesAction, sendAnnounceAction, setPresenceAction } from "./actions";

const field = "w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const label = "text-xs text-muted";
const button = "h-11 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60";

function Feedback({ state }: { state: BotState }) {
  return (
    <>
      {state.error && <p role="alert" className="text-sm text-red-400/90">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-muted">{state.ok}</p>}
    </>
  );
}

export function AnnounceForm() {
  const [state, action, pending] = useActionState<BotState, FormData>(sendAnnounceAction, {});
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="a-title" className={label}>Titre</label>
        <input id="a-title" name="title" required maxLength={200} className={`${field} h-11`} />
      </div>
      <div className="space-y-2">
        <label htmlFor="a-body" className={label}>Message</label>
        <textarea id="a-body" name="body" required rows={5} maxLength={3500} className={`${field} py-3`} />
      </div>
      <div className="space-y-2">
        <label htmlFor="a-url" className={label}>Lien du titre (optionnel)</label>
        <input id="a-url" name="url" type="url" placeholder="https://…" className={`${field} h-11`} />
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Publication…" : "Publier dans le salon"}
      </button>
    </form>
  );
}

export function PresenceForm({ mode: initialMode, type, text }: { mode: "auto" | "custom"; type: string; text: string }) {
  const [state, action, pending] = useActionState<BotState, FormData>(setPresenceAction, {});
  const [mode, setMode] = useState(initialMode);
  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className={label}>Mode</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["auto", "Automatique (stream en cours)"],
              ["custom", "Texte fixe"],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${mode === v ? "border-foreground text-foreground" : "border-line text-muted"}`}>
              <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      {mode === "custom" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr]">
          <div className="space-y-2">
            <label htmlFor="p-type" className={label}>Type</label>
            <select id="p-type" name="type" defaultValue={type} className={`${field} h-11`}>
              <option value="watching">Regarde</option>
              <option value="playing">Joue à</option>
              <option value="listening">Écoute</option>
              <option value="competing">Participe à</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="p-text" className={label}>Texte</label>
            <input id="p-text" name="text" defaultValue={text} maxLength={100} className={`${field} h-11`} />
          </div>
        </div>
      )}
      <p className="text-xs text-muted">Automatique : « Regarde le stream de … » avec le nom des streamers en direct (comptes affichés sur le site), sinon le statut de repos.</p>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Enregistrement…" : "Enregistrer le statut"}
      </button>
    </form>
  );
}

export function PostServicesForm({ className }: { className: string }) {
  const [state, action, pending] = useActionState<BotState, FormData>(postServicesAction, {});
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <button type="submit" disabled={pending} className={className}>
        {pending ? "Publication…" : "Publier dans le salon"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
