"use client";

import { useActionState, useState } from "react";
import { type Bump, BUMPS, formatVersion, nextVersion, type Version } from "@/lib/releases";
import { publishReleaseAction, type ReleaseState } from "./actions";

const field = "w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const label = "text-xs text-muted";

export default function ReleaseForm({ latest }: { latest: Version | null }) {
  const [state, action, pending] = useActionState<ReleaseState, FormData>(publishReleaseAction, {});
  const [bump, setBump] = useState<Bump>("minor");
  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className={label}>Type de version</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {BUMPS.map((b) => (
            <label key={b.id} className={`cursor-pointer rounded-xl border px-4 py-3 ${bump === b.id ? "border-foreground" : "border-line"}`}>
              <input type="radio" name="bump" value={b.id} checked={bump === b.id} onChange={() => setBump(b.id)} className="sr-only" />
              <span className="block font-mono text-sm">{formatVersion(nextVersion(latest, b.id))}</span>
              <span className={`mt-1 block text-sm ${bump === b.id ? "text-foreground" : "text-muted"}`}>{b.label}</span>
              <span className="block text-xs text-muted">{b.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <label htmlFor="r-title" className={label}>Titre</label>
        <input id="r-title" name="title" required maxLength={120} className={`${field} h-11`} />
      </div>
      <div className="space-y-2">
        <label htmlFor="r-notes" className={label}>Notes de version</label>
        <textarea id="r-notes" name="notes" required rows={8} maxLength={3500} placeholder={"**Nouveau**\n- …\n\n**Corrigé**\n- …"} className={`${field} py-3`} />
        <p className="text-xs text-muted">Le texte s&apos;affiche dans Discord : **gras**, listes avec « - » et [liens](https://…) fonctionnent.</p>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="discord" defaultChecked className="size-4 accent-[var(--accent)]" />
        Envoyer dans le salon Discord
      </label>
      {state.error && <p role="alert" className="text-sm text-red-400/90">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-muted">{state.ok}</p>}
      <button type="submit" disabled={pending} className="h-11 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60">
        {pending ? "Publication…" : `Publier la version ${formatVersion(nextVersion(latest, bump))}`}
      </button>
    </form>
  );
}
