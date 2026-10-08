"use client";

import { useActionState, useState } from "react";
import { siKick, siTwitch, siYoutube } from "simple-icons";
import { requestAccessAction, type AccessState } from "@/app/(site)/acces/actions";
import { buttonClass } from "@/components/ui/Button";
import GlassIconView from "@/components/ui/GlassIconView";

// Formulaire de demande d'accès. Noms des champs, action serveur et champ piège inchangés (seul le rendu change).
const field =
  "h-11 w-full rounded-xl border border-line bg-input px-4 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-foreground/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20";
const label = "text-sm text-muted";

// Plateformes de diffusion : logos monochromes (couleur du texte).
const PLATFORMS = [
  { value: "youtube", label: "YouTube", icon: siYoutube },
  { value: "twitch", label: "Twitch", icon: siTwitch },
  { value: "kick", label: "Kick", icon: siKick },
  { value: "autre", label: "Autre", icon: null },
] as const;

export default function AccessForm() {
  const [state, action, pending] = useActionState<AccessState, FormData>(requestAccessAction, {});
  // Heure d'affichage du formulaire : le serveur refuse un envoi trop rapide (antispam).
  const [openedAt] = useState(() => Date.now());

  if (state.ok) {
    return (
      <div role="status" className="flex flex-col items-center py-8 text-center">
        <GlassIconView name="community" size={72} />
        <p className="h-serif mt-8 text-4xl">Demande envoyée.</p>
        <p className="mx-auto mt-4 max-w-[46ch] text-sm leading-relaxed text-muted">
          On étudie chaque demande à la main. Si elle est acceptée, tu reçois un e-mail de SYXTEE NETWORKS avec un bouton pour créer ton compte : ton accès partenaire s&apos;active tout seul.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="t" value={openedAt} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="a-first" className={label}>Prénom</label>
          <input id="a-first" name="first_name" required maxLength={60} autoComplete="given-name" className={field} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="a-last" className={label}>Nom</label>
          <input id="a-last" name="last_name" required maxLength={60} autoComplete="family-name" className={field} />
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="a-email" className={label}>Adresse e-mail</label>
        <input id="a-email" name="email" type="email" required maxLength={160} autoComplete="email" className={field} />
        <p className="text-xs text-muted">Utilise cette même adresse pour créer ton compte : c&apos;est elle qui active ton accès.</p>
      </div>
      <div className="grid gap-2">
        <label htmlFor="a-channel" className={label}>Lien de ta chaîne</label>
        <input id="a-channel" name="channel_url" required maxLength={200} placeholder="twitch.tv/ton-pseudo" className={field} />
      </div>
      <fieldset className="grid gap-2">
        <legend className={`${label} mb-2`}>Plateforme</legend>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <label key={p.value} className="cursor-pointer">
              <input type="radio" name="platform" value={p.value} required className="peer sr-only" />
              <span className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-input px-4 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground peer-checked:border-foreground/50 peer-checked:bg-surface-2 peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/30">
                {p.icon && (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor" className="shrink-0">
                    <path d={p.icon.path} />
                  </svg>
                )}
                {p.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="a-audience" className={label}>Audience moyenne en live</label>
          <input id="a-audience" name="audience" maxLength={40} placeholder="Ex. : 80 viewers" className={field} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="a-devices" className={label}>Matériel</label>
          <input id="a-devices" name="devices" maxLength={200} placeholder="Ex. : téléphone, caméra de poche" className={field} />
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="a-message" className={label}>Pourquoi veux-tu l&apos;accès ?</label>
        <textarea id="a-message" name="message" rows={5} maxLength={1500} placeholder="Parle-nous de ton contenu IRL et de ce que tu cherches." className={`${field} h-auto py-3`} />
      </div>
      {/* Champ piège anti-robots : invisible pour une personne. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-bad" />
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("primary", "h-12 w-full sm:w-auto sm:px-8")}>
        {pending && <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
        {pending ? "Envoi…" : "Envoyer ma demande"}
      </button>
    </form>
  );
}
