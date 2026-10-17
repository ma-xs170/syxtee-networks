"use client";

import { useActionState, useEffect } from "react";
import CopyCode from "@/components/CopyCode";
import { markAffiliateSeenAction, saveAffiliateAction, type AffiliateSettingsState } from "./actions";

const input = "h-11 w-full rounded-lg border border-line bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";

export default function AffiliatePanel({ origin, slug, pseudo, isNew, kit }: { origin: string; slug: string; pseudo: string; isNew: boolean; kit: string }) {
  const [state, action, pending] = useActionState<AffiliateSettingsState, FormData>(saveAffiliateAction, {});
  // Ouvrir l'espace suffit : la pastille « Nouveau » du menu disparaît.
  useEffect(() => {
    if (isNew) void markAffiliateSeenAction();
  }, [isNew]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="tile p-4 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Ton lien affilié</p>
        <div className="mt-4"><CopyCode code={`${origin}/s/${slug}`} /></div>
        <p className="mt-3 text-sm leading-relaxed text-muted">Partage-le en description, en commande de chat ou en bio. Ta page présente SYXTEE et les formules, à ton nom.</p>
        <a href={`/s/${slug}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-foreground underline-offset-4 hover:underline">
          Voir ma page <span aria-hidden="true">→</span>
        </a>
      </section>

      <section className="tile p-4 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Kit à télécharger</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">Logos et visuels SYXTEE pour ta chaîne, ta description et tes réseaux, dans un seul fichier zip.</p>
        <a href={kit} download className="mt-4 inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium">
          Télécharger le kit (zip)
        </a>
      </section>

      <section className="tile p-4 sm:p-6 lg:col-span-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Personnalisation</p>
        <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-end">
          <div>
            <label htmlFor="aff-pseudo" className="mb-2 block text-sm">Pseudo affiché</label>
            <input id="aff-pseudo" name="pseudo" required maxLength={40} defaultValue={pseudo} className={input} />
          </div>
          <div>
            <label htmlFor="aff-slug" className="mb-2 block text-sm">Nom d&apos;URL</label>
            <div className="flex items-center gap-2">
              <span className="hidden shrink-0 font-mono text-xs text-muted sm:inline">/s/</span>
              <input id="aff-slug" name="slug" required maxLength={30} defaultValue={slug} autoCapitalize="none" spellCheck={false} className={`${input} font-mono`} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={pending} className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full btn-tonal px-6 text-sm font-medium disabled:opacity-50">
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <p className="mt-3 text-xs text-muted">Si tu changes le nom d&apos;URL, l&apos;ancien lien ne fonctionne plus : mets à jour ce que tu as déjà partagé.</p>
            {state.error && <p role="alert" className="mt-2 text-sm text-bad">{state.error}</p>}
            {state.ok && <p role="status" className="mt-2 text-sm text-ok">{state.ok}</p>}
          </div>
        </form>
      </section>
    </div>
  );
}
