"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { passwordStrength } from "@/lib/auth/password";
import { changeEmail, changePassword, deleteAccount, saveNames, uploadAvatar, type FormState } from "@/lib/auth/profileActions";
import { PasswordInput } from "./AuthCard";
import { Notice, inputCls } from "./ProfileForm";

function Pending({ idle, busy, danger = false, disabled = false }: { idle: string; busy: string; danger?: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`h-11 rounded-xl px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        danger ? "border border-red-400/40 text-red-300 hover:bg-red-400/10" : "border border-foreground/20 bg-foreground/[0.08] text-foreground hover:bg-foreground/[0.12]"
      }`}
    >
      {pending ? busy : idle}
    </button>
  );
}

/** Prénom + nom (Paramètres, et modale obligatoire des comptes existants). */
export function NamesForm({ first, last, submit = "Enregistrer", onSaved }: { first: string; last: string; submit?: string; onSaved?: () => void }) {
  const [state, action] = useActionState<FormState, FormData>(async (p, f) => {
    const r = await saveNames(p, f);
    if (r.ok) onSaved?.();
    return r;
  }, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="names-first" className="block text-sm font-medium text-foreground/80">
            Prénom
          </label>
          <input id="names-first" name="first_name" autoComplete="given-name" required maxLength={50} defaultValue={state.fields?.first_name ?? first} className={inputCls} />
        </div>
        <div className="space-y-2">
          <label htmlFor="names-last" className="block text-sm font-medium text-foreground/80">
            Nom
          </label>
          <input id="names-last" name="last_name" autoComplete="family-name" required maxLength={50} defaultValue={state.fields?.last_name ?? last} className={inputCls} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Pending idle={submit} busy="Enregistrement…" />
        <Notice state={state} />
      </div>
    </form>
  );
}

export function EmailForm({ current }: { current: string }) {
  const [state, action] = useActionState<FormState, FormData>(changeEmail, {});
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-foreground/60">
        Adresse actuelle : <span data-sensitive className="text-foreground">{current}</span>
      </p>
      <div className="space-y-2">
        <label htmlFor="new-email" className="block text-sm font-medium text-foreground/80">
          Nouvelle adresse
        </label>
        <input id="new-email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} className={inputCls} />
        <p className="text-xs text-foreground/45">Un lien de confirmation part vers l&apos;ancienne et la nouvelle adresse.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Pending idle="Changer d'email" busy="Envoi…" />
        <Notice state={state} />
      </div>
    </form>
  );
}

export function PasswordForm({ email }: { email: string }) {
  const [state, action] = useActionState<FormState, FormData>(changePassword, {});
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== password;
  return (
    <form action={action} className="space-y-4">
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <PasswordInput id="current-password" name="current_password" label="Mot de passe actuel" autoComplete="current-password" value={current} onChange={setCurrent} />
      <PasswordInput id="new-password" name="password" label="Nouveau mot de passe" autoComplete="new-password" value={password} onChange={setPassword} gauge />
      <div className="space-y-2">
        <PasswordInput id="new-password-confirm" name="password_confirm" label="Confirmer" autoComplete="new-password" value={confirm} onChange={setConfirm} />
        {mismatch && <p className="text-xs text-red-400/90">Les deux mots de passe ne correspondent pas.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Pending idle="Changer le mot de passe" busy="Enregistrement…" disabled={mismatch || !current || passwordStrength(password) === 0} />
        <Notice state={state} />
      </div>
    </form>
  );
}

export function AvatarForm({ url, initials }: { url: string | null; initials: string }) {
  const [state, action] = useActionState<FormState, FormData>(uploadAvatar, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-5">
      {url ? (
        <Image src={url} alt="" width={64} height={64} className="h-16 w-16 rounded-full border border-foreground/20 object-cover" />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-foreground/20 font-mono text-xl uppercase text-foreground/70">{initials}</span>
      )}
      <div className="space-y-2">
        <label className="block text-sm text-foreground/70">
          <span className="sr-only">Nouvel avatar</span>
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            required
            className="text-sm text-foreground/60 file:mr-4 file:h-10 file:cursor-pointer file:rounded-xl file:border file:border-foreground/20 file:bg-foreground/[0.08] file:px-4 file:text-sm file:text-foreground hover:file:bg-foreground/[0.12]"
          />
        </label>
        <p className="text-xs text-foreground/45">JPG, PNG ou WebP, 2 Mo maximum.</p>
      </div>
      <Pending idle="Envoyer" busy="Envoi…" />
      <div className="w-full">
        <Notice state={state} />
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState<FormState, FormData>(deleteAccount, {});
  const [text, setText] = useState("");
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm leading-relaxed text-foreground/60">
        Supprime définitivement ton compte, ton profil, tes réseaux et ton avatar. Ta chaîne disparaît de l&apos;accueil. Cette action est irréversible.
      </p>
      <label htmlFor="confirm" className="block text-sm text-foreground/80">
        Tape <span className="font-mono text-foreground">SUPPRIMER</span> pour confirmer
      </label>
      <input id="confirm" name="confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className={`${inputCls} max-w-xs`} />
      <div className="flex flex-wrap items-center gap-4">
        <Pending idle="Supprimer mon compte" busy="Suppression…" danger disabled={text.trim() !== "SUPPRIMER"} />
        <Notice state={state} />
      </div>
    </form>
  );
}
