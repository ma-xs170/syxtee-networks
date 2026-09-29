"use client";

import { useActionState, useMemo, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { siInstagram, siKick, siTiktok, siTwitch, siX, siYoutube, type SimpleIcon } from "simple-icons";
import { linkTwitch } from "@/app/(auth)/actions";
import type { Profile } from "@/lib/auth/dal";
import { saveProfile, type FormState } from "@/lib/auth/profileActions";
import { COUNTRIES } from "@/lib/auth/profileSchema";

// Formulaire de profil : /bienvenue (première connexion, version courte) et /compte (complet).

export const inputCls =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/35 transition-[border-color,box-shadow] focus:border-white/30 focus:outline-none focus:ring-4 focus:ring-white/[0.06]";

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
      <label htmlFor={id} className="block text-sm font-medium text-white/80">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-white/45">{hint}</p>}
    </div>
  );
}

function Social({ name, label, icon, value }: { name: string; label: string; icon: SimpleIcon; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/70" title={label}>
        <Icon icon={icon} />
      </span>
      <label htmlFor={`social-${name}`} className="sr-only">
        {label}
      </label>
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">@</span>
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
      className="h-12 w-full rounded-xl bg-white text-sm font-medium text-black transition-colors hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-60 sm:w-auto sm:px-8"
    >
      {pending ? "Enregistrement…" : children}
    </button>
  );
}

export function Notice({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm text-red-400/90">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="text-sm text-white/70">
        {state.ok}
      </p>
    );
  return null;
}

export default function ProfileForm({ profile, mode, next = "" }: { profile: Profile; mode: "bienvenue" | "compte"; next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile.bind(null, mode), {});
  const v = (k: keyof Profile) => state.fields?.[k] ?? (profile[k] as string | null) ?? "";
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames(["fr"], { type: "region" });
    return COUNTRIES.map((c) => ({ c, n: names.of(c) ?? c })).sort((a, b) => a.n.localeCompare(b.n, "fr"));
  }, []);
  const twitch = profile.twitch_login;

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="next" value={next || (mode === "bienvenue" ? "/dashboard" : "/compte")} />

      <Field id="username" label="Pseudo" hint="3 à 24 caractères : lettres minuscules, chiffres ou _.">
        <input id="username" name="username" required defaultValue={v("username")} autoComplete="username" className={inputCls} />
      </Field>

      {mode === "compte" && (
        <>
          <Field id="bio" label="Bio" hint="160 caractères maximum.">
            <textarea id="bio" name="bio" maxLength={160} rows={3} defaultValue={v("bio")} className={`${inputCls} h-auto resize-none py-3`} />
          </Field>
          <Field id="country" label="Pays">
            <select id="country" name="country" defaultValue={v("country")} className={`${inputCls} appearance-none`}>
              <option value="">Non précisé</option>
              {countries.map(({ c, n }) => (
                <option key={c} value={c}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium text-white/80">Réseaux sociaux</legend>
        {/* Twitch : uniquement via une connexion Twitch vérifiée */}
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/70" title="Twitch">
            <Icon icon={siTwitch} />
          </span>
          {twitch ? (
            <p className="flex h-12 flex-1 items-center rounded-xl border border-white/10 bg-white/[0.02] px-4 text-[15px] text-white">
              @{twitch}
              <span className="ml-auto text-xs text-white/50">Vérifié</span>
            </p>
          ) : (
            <button
              type="submit"
              formAction={linkTwitch}
              formNoValidate
              className="h-12 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-left text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
            >
              Lier mon Twitch
            </button>
          )}
        </div>
        <Social name="kick" label="Kick" icon={siKick} value={v("kick")} />
        <Social name="youtube" label="YouTube" icon={siYoutube} value={v("youtube")} />
        <Social name="tiktok" label="TikTok" icon={siTiktok} value={v("tiktok")} />
        <Social name="instagram" label="Instagram" icon={siInstagram} value={v("instagram")} />
        <Social name="x" label="X" icon={siX} value={v("x")} />
      </fieldset>

      <label className={`flex items-start gap-3 rounded-xl border border-white/10 p-4 ${twitch ? "cursor-pointer" : "opacity-60"}`}>
        <input
          type="checkbox"
          name="show_on_site"
          defaultChecked={profile.show_on_site}
          disabled={!twitch}
          className="mt-0.5 h-4 w-4 shrink-0 accent-white"
        />
        <span>
          <span className="block text-sm font-medium text-white">Afficher ma chaîne sur le site SYXTEE</span>
          <span className="mt-1 block text-xs leading-relaxed text-white/50">
            {twitch
              ? "Ta chaîne Twitch apparaît dans « Ils nous font confiance » sur l'accueil, avec un badge quand tu es en live. Tu peux décocher à tout moment."
              : "Disponible une fois ton Twitch lié."}
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Submit>{mode === "bienvenue" ? "Continuer" : "Enregistrer"}</Submit>
        <Notice state={state} />
      </div>
    </form>
  );
}
