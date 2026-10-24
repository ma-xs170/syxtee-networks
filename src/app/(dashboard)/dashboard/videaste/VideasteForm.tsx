"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { becomeVideasteAction, saveCardAction, unpublishCardAction, type VideasteState } from "./actions";
import { PRICE_UNITS, type CardStatus } from "@/lib/videaste";

export type CardValues = { displayName: string; region: string; country: string; priceFrom: number | null; priceTo: number | null; priceUnit: keyof typeof PRICE_UNITS; bio: string; specialties: string };

const STATUS: Record<CardStatus, { label: string; text: string }> = {
  draft: { label: "Brouillon", text: "Ta fiche n'est pas visible dans l'annuaire." },
  pending: { label: "En relecture", text: "L'équipe vérifie ta fiche avant de la publier." },
  published: { label: "Publiée", text: "Ta fiche est visible dans l'annuaire." },
  rejected: { label: "Refusée", text: "Corrige ce qui est indiqué et renvoie la fiche." },
};

const field = "mt-2 h-11 w-full rounded-xl border border-line bg-background px-4 text-sm focus:border-foreground/70 focus:outline-none";

export function BecomeVideaste() {
  const [pending, start] = useTransition();
  return (
    <div>
      <p className="max-w-[60ch] text-sm leading-relaxed text-muted">
        Le compte vidéaste est gratuit. Tu gardes tes connexions, tes aperçus et tes statistiques en direct, et tu peux afficher ta fiche (photo, région, prix) dans l&apos;annuaire. Les streamers te contactent par SYXTEE, sans voir ton e-mail.
      </p>
      <button type="button" disabled={pending} onClick={() => start(async () => void (await becomeVideasteAction()))} className="mt-6 h-11 whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium disabled:opacity-60">
        {pending ? "Un instant…" : "Activer mon compte vidéaste"}
      </button>
    </div>
  );
}

export function CardForm({ values, status, note, avatar, countries }: { values: CardValues; status: CardStatus; note: string | null; avatar: string | null; countries: { code: string; name: string }[] }) {
  const [state, action, pending] = useActionState<VideasteState, FormData>(saveCardAction, {});
  const [unpublishing, start] = useTransition();
  const shown = state.status ?? status;
  const s = STATUS[shown];
  return (
    <form action={action}>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-line p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {avatar ? <img src={avatar} alt="Ta photo" className="size-16 rounded-full object-cover" /> : <span className="grid size-16 place-items-center rounded-full bg-foreground/10 text-xs text-muted">Photo</span>}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{avatar ? "Ta photo d'annuaire" : "Aucune photo"}</p>
          <p className="mt-0.5 text-xs text-muted">C&apos;est ton avatar : il doit montrer ton visage. <Link href="/dashboard/compte" className="underline underline-offset-4">Le changer dans Compte</Link></p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{s.label}</p>
          <p className="mt-0.5 text-xs text-muted">{s.text}</p>
        </div>
      </div>
      {(state.error || (shown === "rejected" && note)) && <p role="alert" className="mb-4 text-sm text-red-400">{state.error ?? note}</p>}
      {state.ok && <p role="status" className="mb-4 text-sm text-ok">{state.ok}</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm">Nom affiché<input name="displayName" defaultValue={values.displayName} required minLength={2} maxLength={60} className={field} /></label>
        <label className="text-sm">Région ou ville<input name="region" defaultValue={values.region} required maxLength={80} placeholder="Île-de-France, Lyon…" className={field} /></label>
        <label className="text-sm">Pays
          <select name="country" defaultValue={values.country} className={field}>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Tarif par
          <select name="priceUnit" defaultValue={values.priceUnit} className={field}>
            {Object.entries(PRICE_UNITS).map(([k, v]) => <option key={k} value={k}>{v.replace(/^(l'|la |le )/, "")}</option>)}
          </select>
        </label>
        <label className="text-sm">Prix à partir de (€)<input name="priceFrom" type="number" min={0} max={100000} defaultValue={values.priceFrom ?? ""} inputMode="numeric" className={field} /></label>
        <label className="text-sm">Jusqu&apos;à (€, facultatif)<input name="priceTo" type="number" min={0} max={100000} defaultValue={values.priceTo ?? ""} inputMode="numeric" className={field} /></label>
      </div>
      <label className="mt-5 block text-sm">Présentation <span className="text-muted">(500 caractères, sans e-mail, lien ni numéro)</span>
        <textarea name="bio" defaultValue={values.bio} maxLength={500} rows={4} className="mt-2 w-full rounded-xl border border-line bg-background p-4 text-sm focus:border-foreground/70 focus:outline-none" />
      </label>
      <label className="mt-5 block text-sm">Spécialités <span className="text-muted">(séparées par des virgules, 6 au plus)</span>
        <input name="specialties" defaultValue={values.specialties} maxLength={300} placeholder="live IRL, clip, événementiel" className={field} />
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="submit" disabled={pending} className="h-11 whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium disabled:opacity-60">{pending ? "Vérification…" : shown === "draft" ? "Publier ma fiche" : "Enregistrer et revérifier"}</button>
        {shown === "published" && (
          <button type="button" disabled={unpublishing} onClick={() => start(async () => void (await unpublishCardAction()))} className="h-11 whitespace-nowrap rounded-full border border-line px-5 text-sm transition-colors hover:bg-foreground/10 disabled:opacity-60">
            Retirer de l&apos;annuaire
          </button>
        )}
      </div>
    </form>
  );
}
