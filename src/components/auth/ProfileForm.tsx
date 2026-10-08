"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { siInstagram, siKick, siTiktok, siTwitch, siX, siYoutube, type SimpleIcon } from "simple-icons";
import type { Profile } from "@/lib/auth/dal";
import { saveProfile, type FormState } from "@/lib/auth/profileActions";
import RegionPicker from "@/components/auth/RegionPicker";

// Formulaire de profil : /bienvenue (première connexion, version courte) et /compte (complet).

export const inputCls =
  "h-12 w-full rounded-xl border border-foreground/20 bg-foreground/[0.08] px-4 text-[15px] text-foreground placeholder:text-foreground/35 transition-[border-color,box-shadow] focus:border-foreground/40 focus:outline-none focus:ring-4 focus:ring-foreground/[0.06]";

function Icon({ icon }: { icon: SimpleIcon }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path d={icon.path} />
    </svg>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-foreground/80">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-foreground/45">{hint}</p>}
    </div>
  );
}

function Social({ name, label, icon, value }: { name: string; label: string; icon: SimpleIcon; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-foreground/20 text-foreground/70" title={label}>
        <Icon icon={icon} />
      </span>
      <label htmlFor={`social-${name}`} className="sr-only">
        {label}
      </label>
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/35">@</span>
        <input id={`social-${name}`} name={name} defaultValue={value} placeholder={`Pseudo ${label}`} autoComplete="off" className={`${inputCls} pl-8`} />
      </div>
    </div>
  );
}

function Submit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-accent text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.99] disabled:opacity-60 sm:w-auto sm:px-8"
    >
      {pending ? "Enregistrement…" : children}
    </button>
  );
}

export function Notice({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm text-bad">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="text-sm text-foreground/70">
        {state.ok}
      </p>
    );
  return null;
}

export default function ProfileForm({ profile, mode, next = "" }: { profile: Profile; mode: "bienvenue" | "compte"; next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile.bind(null, mode), {});
  const v = (k: keyof Profile) => state.fields?.[k] ?? (profile[k] as string | null) ?? "";
  // Twitch vérifié (connexion) : affiché tel quel. Sinon : un simple pseudo, comme Kick et YouTube (lien twitch.tv/<pseudo>).
  const verified = profile.twitch_login;

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="next" value={next || (mode === "bienvenue" ? "/dashboard" : "/compte")} />

      <RegionPicker country={v("country")} timezone={v("timezone")} required={mode === "bienvenue"} />

      {mode === "compte" && (
        <Field id="bio" label="Bio" hint="160 caractères maximum.">
          <textarea id="bio" name="bio" maxLength={160} rows={3} defaultValue={v("bio")} className={`${inputCls} h-auto resize-none py-3`} />
        </Field>
      )}

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium text-foreground/80">{mode === "bienvenue" ? "Tes chaînes (au moins une)" : "Réseaux sociaux"}</legend>
        {verified ? (
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-foreground/20 text-foreground/70" title="Twitch">
              <Icon icon={siTwitch} />
            </span>
            <p className="flex h-12 flex-1 items-center rounded-xl border border-foreground/20 bg-foreground/[0.08] px-4 text-[15px] text-foreground">
              @{verified}
              <span className="ml-auto text-xs text-foreground/50">Vérifié</span>
            </p>
          </div>
        ) : (
          <Social name="twitch" label="Twitch" icon={siTwitch} value={v("twitch")} />
        )}
        {mode === "compte" && <Social name="kick" label="Kick" icon={siKick} value={v("kick")} />}
        <Social name="youtube" label="YouTube" icon={siYoutube} value={v("youtube")} />
        {mode === "compte" && (
          <>
            <Social name="tiktok" label="TikTok" icon={siTiktok} value={v("tiktok")} />
            <Social name="instagram" label="Instagram" icon={siInstagram} value={v("instagram")} />
            <Social name="x" label="X" icon={siX} value={v("x")} />
          </>
        )}
      </fieldset>

      <label className={`flex items-start gap-3 rounded-xl border border-foreground/20 p-4 cursor-pointer`}>
        <input
          type="checkbox"
          name="show_on_site"
          defaultChecked={mode === "bienvenue" ? true : profile.show_on_site}
          className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">Afficher ma chaîne sur le site SYXTEE</span>
          <span className="mt-1 block text-xs leading-relaxed text-foreground/50">
            Ta chaîne apparaît dans « Ils streament avec SYXTEE » sur l&apos;accueil, avec un lien vers twitch.tv/ton-pseudo. Tu peux décocher à tout moment.
          </span>
        </span>
      </label>

      {mode === "compte" && (
      <label className={`flex items-start gap-3 rounded-xl border border-foreground/20 p-4 cursor-pointer`}>
        <input
          type="checkbox"
          name="show_first_name"
          defaultChecked={profile.show_first_name === true}
          className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">Afficher mon prénom sur le site</span>
          <span className="mt-1 block text-xs leading-relaxed text-foreground/50">
            Ton prénom apparaît à côté de ta chaîne dans « Ils nous font confiance ». Jamais ton nom.
          </span>
        </span>
      </label>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Submit>{mode === "bienvenue" ? "Continuer" : "Enregistrer"}</Submit>
        <Notice state={state} />
      </div>
    </form>
  );
}
