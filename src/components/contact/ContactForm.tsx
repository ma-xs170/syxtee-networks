"use client";

import { useActionState, useState } from "react";
import { contactAction, type ContactState } from "@/app/(site)/contact/actions";
import { buttonClass } from "@/components/ui/Button";

// Formulaire de demande de devis : événement, lieu, date, durée, besoins, description. Champ piège et horodatage antispam.
const field =
  "h-11 w-full rounded-xl border border-line bg-input px-4 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-foreground/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20";
const label = "text-sm font-medium";
const hint = "text-xs text-muted";

const EVENT_TYPES = ["Marathon ou semi-marathon", "Course à pied ou trail", "Course cycliste", "Manifestation publique", "Festival ou concert", "Événement sportif", "Reportage ou tournage en mobilité", "Autre"];
const DURATIONS = ["Moins de 2 h", "2 à 4 h", "4 à 8 h", "Plus de 8 h", "Plusieurs jours"];
const NEEDS = ["Plusieurs caméras", "Bonding 4G / 5G", "Liaison satellite", "Contrôle à distance d'OBS", "Multistream", "Équipe sur place"];

const Select = ({ id, name, required, placeholder, options }: { id: string; name: string; required?: boolean; placeholder: string; options: string[] }) => (
  <div className="relative">
    <select id={id} name={name} required={required} defaultValue="" className={`${field} appearance-none pr-10`}>
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"><path d="m6 9 6 6 6-6" /></svg>
  </div>
);

export default function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(contactAction, {});
  const [openedAt] = useState(() => Date.now());

  if (state.ok) {
    return (
      <div role="status" className="rounded-2xl border border-line bg-surface p-8 text-center sm:p-12">
        <p className="h-serif text-4xl">Demande <em>envoyée.</em></p>
        <p className="mx-auto mt-4 max-w-[46ch] text-sm leading-relaxed text-muted">Merci. On étudie ton projet et on revient vers toi par e-mail avec un devis gratuit et personnalisé.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="t" value={openedAt} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="c-name" className={label}>Nom *</label>
          <input id="c-name" name="name" required maxLength={80} autoComplete="name" placeholder="Jean Dupont" className={field} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="c-email" className={label}>E-mail *</label>
          <input id="c-email" name="email" type="email" required maxLength={160} autoComplete="email" placeholder="jean@exemple.fr" className={field} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="c-type" className={label}>Type d&apos;événement *</label>
          <Select id="c-type" name="event_type" required placeholder="Sélectionne un type" options={EVENT_TYPES} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="c-location" className={label}>Lieu ou ville *</label>
          <input id="c-location" name="location" required maxLength={120} placeholder="Ex. : Paris" className={field} />
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="c-message" className={label}>Décris ton projet *</label>
        <textarea id="c-message" name="message" required minLength={10} rows={5} maxLength={2000} placeholder="Ton projet, le parcours, les contraintes, ton budget approximatif…" className={`${field} h-auto py-3`} />
      </div>

      <details className="group rounded-xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span>Ajouter des détails <span className="font-normal text-muted">(facultatif)</span></span>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-muted transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        <div className="space-y-5 border-t border-line p-4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="c-date" className={label}>Date prévue</label>
              <input id="c-date" name="date" maxLength={60} placeholder="Ex. : 12 avril 2027" className={field} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="c-duration" className={label}>Durée du direct</label>
              <Select id="c-duration" name="duration" placeholder="Sélectionne" options={DURATIONS} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="c-phone" className={label}>Téléphone</label>
              <input id="c-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" placeholder="06 12 34 56 78" className={field} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="c-channel" className={label}>Ta chaîne</label>
              <input id="c-channel" name="channel" maxLength={200} placeholder="twitch.tv/ton-pseudo" className={field} />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="c-audience" className={label}>Audience attendue</label>
            <input id="c-audience" name="audience" maxLength={60} placeholder="Ex. : 5 000 spectateurs sur place" className={field} />
          </div>
          <fieldset className="grid gap-3">
            <legend className={`${label} mb-1`}>Besoins</legend>
            <div className="flex flex-wrap gap-2">
              {NEEDS.map((n) => (
                <label key={n} className="cursor-pointer">
                  <input type="checkbox" name="needs" value={n} className="peer sr-only" />
                  <span className="flex h-10 items-center rounded-xl border border-line bg-input px-4 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground peer-checked:border-foreground/50 peer-checked:bg-surface-2 peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/30">{n}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-muted">
        <input type="checkbox" name="consent" required className="mt-1 size-4 shrink-0 accent-[var(--foreground)]" />
        <span>J&apos;accepte que mes données soient utilisées pour me recontacter au sujet de ce devis. <a href="/confidentialite" className="font-medium text-foreground underline underline-offset-4">Politique de confidentialité</a></span>
      </label>

      {state.error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-bad" />
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("primary", "h-12 w-full")}>
        {pending ? <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" /> : <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>}
        {pending ? "Envoi…" : "Envoyer ma demande de devis"}
      </button>
    </form>
  );
}
