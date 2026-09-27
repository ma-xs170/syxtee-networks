"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAccount, uploadAvatar, type FormState } from "@/lib/auth/profileActions";
import { Notice, inputCls } from "./ProfileForm";

function Pending({ idle, busy, danger = false, disabled = false }: { idle: string; busy: string; danger?: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`h-11 rounded-xl px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        danger ? "border border-red-400/40 text-red-300 hover:bg-red-400/10" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
      }`}
    >
      {pending ? busy : idle}
    </button>
  );
}

export function AvatarForm({ url, name }: { url: string | null; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(uploadAvatar, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-5">
      {url ? (
        <Image src={url} alt="" width={64} height={64} className="h-16 w-16 rounded-full border border-white/10 object-cover" />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 font-mono text-xl uppercase text-white/70">{name.charAt(0)}</span>
      )}
      <div className="space-y-2">
        <label className="block text-sm text-white/70">
          <span className="sr-only">Nouvel avatar</span>
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            required
            className="text-sm text-white/60 file:mr-4 file:h-10 file:cursor-pointer file:rounded-xl file:border file:border-white/10 file:bg-white/[0.04] file:px-4 file:text-sm file:text-white hover:file:bg-white/[0.08]"
          />
        </label>
        <p className="text-xs text-white/45">JPG, PNG ou WebP, 2 Mo maximum.</p>
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
      <p className="text-sm leading-relaxed text-white/60">
        Supprime définitivement ton compte, ton profil, tes réseaux et ton avatar. Ta chaîne disparaît de l&apos;accueil. Cette action est irréversible.
      </p>
      <label htmlFor="confirm" className="block text-sm text-white/80">
        Tape <span className="font-mono text-white">SUPPRIMER</span> pour confirmer
      </label>
      <input id="confirm" name="confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className={`${inputCls} max-w-xs`} />
      <div className="flex flex-wrap items-center gap-4">
        <Pending idle="Supprimer mon compte" busy="Suppression…" danger disabled={text.trim() !== "SUPPRIMER"} />
        <Notice state={state} />
      </div>
    </form>
  );
}
