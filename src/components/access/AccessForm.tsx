"use client";

import { useActionState } from "react";
import { requestAccessAction, type AccessState } from "@/app/(site)/acces/actions";

const field =
  "h-11 w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground placeholder:text-muted focus:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30";
const label = "text-sm font-medium";

export default function AccessForm() {
  const [state, action, pending] = useActionState<AccessState, FormData>(requestAccessAction, {});

  if (state.ok) {
    return (
      <div role="status" className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="text-xl font-semibold tracking-tight">Demande envoyée.</p>
        <p className="mx-auto mt-3 max-w-[46ch] text-sm leading-relaxed text-muted">
          On étudie chaque demande à la main. Si elle est acceptée, tu reçois un email de SYXTEE NETWORKS avec un bouton pour créer ton compte : ton accès partenaire s&apos;active tout seul.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="a-first" className={label}>
            Prénom
          </label>
          <input id="a-first" name="first_name" required maxLength={60} autoComplete="given-name" className={field} />
        </div>
        <div className="space-y-2">
          <label htmlFor="a-last" className={label}>
            Nom
          </label>
          <input id="a-last" name="last_name" required maxLength={60} autoComplete="family-name" className={field} />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="a-email" className={label}>
          Email
        </label>
        <input id="a-email" name="email" type="email" required maxLength={160} autoComplete="email" className={field} />
        <p className="text-xs text-muted">Utilise cette même adresse pour créer ton compte : c&apos;est elle qui active ton accès.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_11rem]">
        <div className="space-y-2">
          <label htmlFor="a-channel" className={label}>
            Lien de ta chaîne
          </label>
          <input id="a-channel" name="channel_url" required maxLength={200} placeholder="twitch.tv/ton-pseudo" className={field} />
        </div>
        <div className="space-y-2">
          <label htmlFor="a-platform" className={label}>
            Plateforme
          </label>
          <select id="a-platform" name="platform" required defaultValue="" className={field}>
            <option value="" disabled>
              Choisir
            </option>
            <option value="twitch">Twitch</option>
            <option value="kick">Kick</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="autre">Autre</option>
          </select>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="a-audience" className={label}>
            Audience moyenne en live
          </label>
          <input id="a-audience" name="audience" maxLength={40} placeholder="Ex. : 80 viewers" className={field} />
        </div>
        <div className="space-y-2">
          <label htmlFor="a-devices" className={label}>
            Matériel
          </label>
          <input id="a-devices" name="devices" maxLength={200} placeholder="Ex. : iPhone 16, Moblin, Osmo Pocket 3" className={field} />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="a-message" className={label}>
          Pourquoi veux-tu l&apos;accès ?
        </label>
        <textarea
          id="a-message"
          name="message"
          rows={5}
          maxLength={1500}
          placeholder="Parle-nous de ton contenu IRL et de ce que tu cherches."
          className={`${field} h-auto py-3`}
        />
      </div>
      {/* Champ piège anti-robots : invisible pour une personne. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-400/90">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-xl bg-accent px-8 text-base font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Envoyer ma demande"}
      </button>
    </form>
  );
}
