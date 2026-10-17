"use client";

import { useActionState } from "react";
import { applySponsorAction, type SponsorApplyState } from "./actions";

export default function ApplyForm({ categories }: { categories: readonly string[] }) {
  const [state, action, pending] = useActionState<SponsorApplyState, FormData>(applySponsorAction, {});
  return (
    <form action={action} className="mt-4 grid gap-5">
      <fieldset>
        <legend className="mb-2 text-sm">Catégories de sponsors qui t&apos;intéressent</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="checkbox" name="categories" value={c} className="peer sr-only" />
              <span className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm transition-colors peer-checked:border-foreground peer-checked:bg-foreground/10 peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/60">{c}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="sp-message" className="mb-2 block text-sm">Ta chaîne et ton audience (facultatif)</label>
        <textarea id="sp-message" name="message" rows={4} maxLength={1000} className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60" />
      </div>
      {state.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <div>
        <button type="submit" disabled={pending} className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium disabled:opacity-60">
          {pending ? "Envoi…" : "Envoyer ma candidature"}
        </button>
      </div>
    </form>
  );
}
