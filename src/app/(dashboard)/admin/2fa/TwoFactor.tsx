"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { enrollTotp, verifyTotp, type EnrollState, type VerifyState } from "./actions";

const field = "h-12 w-full rounded-xl border border-accent/20 bg-accent/[0.08] px-4 text-center font-mono text-xl tracking-[0.4em] text-foreground focus:border-accent/40 focus:outline-none focus:ring-4 focus:ring-accent/[0.06]";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-accent text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60">
      {pending ? "Vérification…" : "Vérifier"}
    </button>
  );
}

function CodeForm({ factorId }: { factorId: string }) {
  const [state, action] = useActionState<VerifyState, FormData>(verifyTotp, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="factorId" value={factorId} />
      <label htmlFor="code" className="block text-sm font-medium text-foreground/80">
        Code à 6 chiffres
      </label>
      <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus className={field} />
      <Submit />
      {state.error && (
        <p role="alert" className="text-center text-sm text-red-400/90">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** `factorId` : facteur déjà vérifié (on demande juste le code). Sinon : enrôlement avec QR code. */
export default function TwoFactor({ factorId }: { factorId: string | null }) {
  const [enroll, setEnroll] = useState<EnrollState | null>(null);
  const [pending, start] = useTransition();

  if (factorId) return <CodeForm factorId={factorId} />;
  if (!enroll?.factorId)
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/60">
          Première connexion admin : ajoute SYXTEE dans ton application d&apos;authentification (Google Authenticator, 1Password…).
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => setEnroll(await enrollTotp()))}
          className="h-12 w-full rounded-xl bg-accent text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Création…" : "Configurer la double authentification"}
        </button>
        {enroll?.error && (
          <p role="alert" className="text-sm text-red-400/90">
            {enroll.error}
          </p>
        )}
      </div>
    );
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-foreground/60">Scanne ce QR code avec ton application, puis saisis le code affiché.</p>
      <div className="mx-auto w-fit rounded-xl bg-accent p-3">
        {/* QR code fourni par Supabase en data:image/svg+xml non encodé : next/image le refuse. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enroll.qr} alt="QR code de la double authentification" width={180} height={180} />
      </div>
      <p className="text-center text-xs text-foreground/50">
        Pas de caméra ? Clé : <span className="select-all break-all font-mono text-foreground/80">{enroll.secret}</span>
      </p>
      <CodeForm factorId={enroll.factorId} />
    </div>
  );
}
