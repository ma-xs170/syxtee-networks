"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useId, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { motion, type Variants } from "motion/react";
import { requestPasswordReset, resendVerification, resetPassword, signIn, signUp, type AuthState } from "@/app/(auth)/actions";
import { PASSWORD_MIN, passwordStrength, STRENGTH_LABEL } from "@/lib/auth/password";

// Cartes d'authentification (email + mot de passe) : connexion, inscription, mot de passe oublié, nouveau mot de passe.
// Design façon Resend : drapés en fond (layout), tuile logo, champs arrondis, bouton blanc.

const RESEND_DELAY = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const IDLE: AuthState = { status: "idle" };

const list: Variants = { show: { transition: { staggerChildren: 0.05 } } };
const item: Variants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } };

export const fieldCls =
  "h-[52px] w-full rounded-xl border border-foreground/20 bg-foreground/[0.08] px-4 text-[15px] text-foreground placeholder:text-foreground/35 transition-[border-color,box-shadow] focus:border-foreground/40 focus:outline-none focus:ring-4 focus:ring-foreground/[0.06]";

export function LogoTile() {
  return (
    <motion.div variants={item} className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] border border-foreground/20 bg-[#0a0a0a] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-8px_16px_rgba(0,0,0,0.6)]">
      <Image src="/logo-400.png" alt="SYXTEE" width={18} height={25} priority />
    </motion.div>
  );
}

function Shell({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <motion.div initial="hidden" animate="show" variants={list} className="w-full max-w-[420px]">
      <LogoTile />
      <motion.h1 variants={item} className="mt-8 text-center text-3xl font-semibold tracking-tight">
        {title}
      </motion.h1>
      {sub && (
        <motion.p variants={item} className="mt-3 text-center text-sm leading-relaxed text-foreground/60">
          {sub}
        </motion.p>
      )}
      {children}
    </motion.div>
  );
}

function Field({ id, label, aside, children }: { id: string; label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-medium text-foreground/80">
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Submit({ idle, busy, disabled = false }: { idle: string; busy: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="h-12 w-full whitespace-nowrap rounded-xl bg-accent text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-foreground/20 disabled:text-foreground/35"
    >
      {pending ? busy : idle}
    </button>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-center text-sm text-red-400/90">
      {children}
    </p>
  );
}

/** Mot de passe avec œil afficher / masquer, et jauge de solidité en direct (inscription, nouveau mot de passe). */
export function PasswordInput({ id, name, label, autoComplete, value, onChange, gauge = false, aside }: {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (v: string) => void;
  gauge?: boolean;
  aside?: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const hintId = useId();
  const strength = passwordStrength(value);
  return (
    <Field id={id} label={label} aside={aside}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={gauge ? PASSWORD_MIN : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={gauge ? hintId : undefined}
          className={`${fieldCls} pr-24`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-lg px-3 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/[0.12] hover:text-foreground"
        >
          {shown ? "Masquer" : "Afficher"}
        </button>
      </div>
      {gauge && (
        <div id={hintId} className="space-y-1.5" aria-live="polite">
          <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1 rounded-full transition-colors ${value && i <= strength ? (strength === 0 ? "bg-foreground/20" : strength === 1 ? "bg-foreground/20" : "bg-accent") : "bg-foreground/20"}`} />
            ))}
          </div>
          <p className="text-xs text-foreground/50">
            {value ? (
              <>
                Solidité : <span className="text-foreground/80">{STRENGTH_LABEL[strength]}</span>
                {value.length < PASSWORD_MIN && ` · ${PASSWORD_MIN - value.length} caractère${PASSWORD_MIN - value.length > 1 ? "s" : ""} de plus`}
              </>
            ) : (
              `${PASSWORD_MIN} caractères minimum. Une phrase est plus solide qu'un mot.`
            )}
          </p>
        </div>
      )}
    </Field>
  );
}

function ResendButton({ at }: { at: number }) {
  const { pending } = useFormStatus();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil(RESEND_DELAY - (now - at) / 1000));
  return (
    <button
      type="submit"
      disabled={left > 0 || pending}
      className="h-12 w-full rounded-xl border border-foreground/20 bg-foreground/[0.08] text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.12] disabled:cursor-not-allowed disabled:text-foreground/40 disabled:hover:bg-foreground/[0.08]"
    >
      <span className="tabular-nums">{pending ? "Envoi…" : left > 0 ? `Renvoyer l'email (${left} s)` : "Renvoyer l'email"}</span>
    </button>
  );
}

/** « Vérifie ta boîte mail » : après l'inscription (avec renvoi) ou une demande de réinitialisation. */
function CheckMail({ email, at, lead, resend, next, onBack }: { email: string; at: number; lead: ReactNode; resend?: (p: AuthState, f: FormData) => Promise<AuthState>; next?: string; onBack: () => void }) {
  const [state, action] = useActionState<AuthState, FormData>(resend ?? (async (s) => s), IDLE);
  const sentAt = state.status === "sent" ? state.at : at;
  return (
    <Shell title="Vérifie ta boîte mail" sub={lead}>
      <motion.p variants={item} className="mt-2 text-center text-sm text-foreground/60">
        <span className="font-medium text-foreground">{email}</span>
      </motion.p>
      <motion.p variants={item} className="mt-4 text-center text-xs leading-relaxed text-foreground/45">
        Rien reçu ? Regarde dans les spams, ou vérifie l&apos;adresse.
      </motion.p>
      {resend && (
        <motion.form variants={item} action={action} className="mt-8">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next ?? ""} />
          <ResendButton key={sentAt} at={sentAt} />
        </motion.form>
      )}
      {state.status === "error" && (
        <motion.div variants={item} className="mt-4">
          <ErrorText>{state.message}</ErrorText>
        </motion.div>
      )}
      <motion.div variants={item} className="mt-4 text-center">
        <button type="button" onClick={onBack} className="text-sm text-foreground/60 underline-offset-4 transition-colors hover:text-foreground hover:underline">
          Changer d&apos;email
        </button>
      </motion.div>
    </Shell>
  );
}

function Legal() {
  return (
    <>
      <Link href="/cgu" target="_blank" className="underline underline-offset-2 hover:text-foreground">
        Conditions d&apos;utilisation
      </Link>{" "}
      et la{" "}
      <Link href="/confidentialite" target="_blank" className="underline underline-offset-2 hover:text-foreground">
        Politique de confidentialité
      </Link>
    </>
  );
}

// ─────────────────────────── Connexion ───────────────────────────

export function SignInCard({ next = "", error }: { next?: string; error?: string | null }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, IDLE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nextQ = next ? `?next=${encodeURIComponent(next)}` : "";
  const message = state.status === "error" ? state.message : error;

  return (
    <Shell
      title="Connexion à SYXTEE"
      sub={
        <>
          Pas encore de compte ?{" "}
          <Link href={`/inscription${nextQ}`} className="font-medium text-foreground hover:underline">
            Inscris-toi.
          </Link>
        </>
      }
    >
      <motion.form variants={item} action={action} className="mt-10 space-y-5">
        <input type="hidden" name="next" value={next} />
        <Field id="email" label="Email">
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" className={fieldCls} />
        </Field>
        <PasswordInput
          id="password"
          name="password"
          label="Mot de passe"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          aside={
            <Link href={`/mot-de-passe-oublie${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-xs text-foreground/60 hover:text-foreground hover:underline">
              Mot de passe oublié ?
            </Link>
          }
        />
        <div className="pt-1">
          <Submit idle="Se connecter" busy="Connexion…" disabled={!EMAIL_RE.test(email.trim()) || !password} />
        </div>
      </motion.form>

      {message && (
        <motion.div variants={item} className="mt-4">
          <ErrorText>{message}</ErrorText>
        </motion.div>
      )}

      <motion.p variants={item} className="mt-10 rounded-xl border border-foreground/20 bg-foreground/[0.08] p-4 text-center text-xs leading-relaxed text-foreground/55">
        Compte créé avec Twitch, Discord, Google ou un lien par email ?{" "}
        <Link href={`/mot-de-passe-oublie${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="font-medium text-foreground hover:underline">
          Définis ton mot de passe
        </Link>{" "}
        avec la même adresse : tu retrouves tout ton compte.
      </motion.p>
    </Shell>
  );
}

// ─────────────────────────── Inscription ───────────────────────────

export function SignUpCard({ next = "", error }: { next?: string; error?: string | null }) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, IDLE);
  const [dismissed, setDismissed] = useState<AuthState | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const nextQ = next ? `?next=${encodeURIComponent(next)}` : "";
  const fields = state.status === "error" ? state.fields : undefined;

  if (state.status === "sent" && dismissed !== state) {
    return (
      <CheckMail
        email={state.email}
        at={state.at}
        next={next}
        resend={resendVerification}
        onBack={() => setDismissed(state)}
        lead="On t'a envoyé un lien pour activer ton compte. Il est valable 24 h."
      />
    );
  }

  const mismatch = confirm.length > 0 && confirm !== password;
  return (
    <Shell
      title="Crée ton compte SYXTEE"
      sub={
        <>
          Déjà un compte ?{" "}
          <Link href={`/connexion${nextQ}`} className="font-medium text-foreground hover:underline">
            Connecte-toi.
          </Link>
        </>
      }
    >
      <motion.form variants={item} action={action} className="mt-10 space-y-5">
        <input type="hidden" name="next" value={next} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="first_name" label="Prénom">
            <input id="first_name" name="first_name" autoComplete="given-name" required maxLength={50} defaultValue={fields?.first_name} className={fieldCls} />
          </Field>
          <Field id="last_name" label="Nom">
            <input id="last_name" name="last_name" autoComplete="family-name" required maxLength={50} defaultValue={fields?.last_name} className={fieldCls} />
          </Field>
        </div>
        <Field id="email" label="Email">
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={fields?.email} placeholder="toi@exemple.com" className={fieldCls} />
        </Field>
        <PasswordInput id="password" name="password" label="Mot de passe" autoComplete="new-password" value={password} onChange={setPassword} gauge />
        <div className="space-y-2">
          <PasswordInput id="password_confirm" name="password_confirm" label="Confirmer le mot de passe" autoComplete="new-password" value={confirm} onChange={setConfirm} />
          {mismatch && <p className="text-xs text-red-400/90">Les deux mots de passe ne correspondent pas.</p>}
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-foreground/60">
          <input type="checkbox" name="cgu" required className="mt-0.5 h-4 w-4 shrink-0 accent-accent" />
          <span>
            J&apos;accepte les <Legal />.
          </span>
        </label>
        <div className="pt-1">
          <Submit idle="Créer mon compte" busy="Création…" disabled={mismatch || passwordStrength(password) === 0} />
        </div>
      </motion.form>

      {(state.status === "error" || error) && (
        <motion.div variants={item} className="mt-4">
          <ErrorText>{state.status === "error" ? state.message : error}</ErrorText>
        </motion.div>
      )}
    </Shell>
  );
}

// ─────────────────────────── Mot de passe oublié ───────────────────────────

export function ForgotCard({ email: initial = "", error }: { email?: string; error?: string | null }) {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, IDLE);
  const [dismissed, setDismissed] = useState<AuthState | null>(null);
  const [email, setEmail] = useState(initial);

  if (state.status === "sent" && dismissed !== state) {
    return (
      <CheckMail
        email={state.email}
        at={state.at}
        onBack={() => setDismissed(state)}
        lead="Si un compte existe avec cette adresse, tu vas recevoir un lien pour choisir un nouveau mot de passe. Il est valable 1 h."
      />
    );
  }
  return (
    <Shell title="Mot de passe oublié" sub="Indique ton adresse : on t'envoie un lien pour en choisir un nouveau.">
      <motion.form variants={item} action={action} className="mt-10 space-y-5">
        <Field id="email" label="Email">
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" className={fieldCls} />
        </Field>
        <Submit idle="Envoyer le lien" busy="Envoi…" disabled={!EMAIL_RE.test(email.trim())} />
      </motion.form>
      {(state.status === "error" || error) && (
        <motion.div variants={item} className="mt-4">
          <ErrorText>{state.status === "error" ? state.message : error}</ErrorText>
        </motion.div>
      )}
      <motion.p variants={item} className="mt-8 text-center text-sm">
        <Link href="/connexion" className="text-foreground/60 hover:text-foreground hover:underline">
          Retour à la connexion
        </Link>
      </motion.p>
    </Shell>
  );
}

// ─────────────────────────── Nouveau mot de passe ───────────────────────────

export function ResetCard({ email }: { email: string }) {
  const [state, action] = useActionState<AuthState, FormData>(resetPassword, IDLE);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== password;
  return (
    <Shell title="Nouveau mot de passe" sub={<>Pour le compte <span className="font-medium text-foreground">{email}</span>.</>}>
      <motion.form variants={item} action={action} className="mt-10 space-y-5">
        {/* Aide les gestionnaires de mots de passe à associer le nouveau mot de passe au bon compte. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <PasswordInput id="password" name="password" label="Nouveau mot de passe" autoComplete="new-password" value={password} onChange={setPassword} gauge />
        <div className="space-y-2">
          <PasswordInput id="password_confirm" name="password_confirm" label="Confirmer" autoComplete="new-password" value={confirm} onChange={setConfirm} />
          {mismatch && <p className="text-xs text-red-400/90">Les deux mots de passe ne correspondent pas.</p>}
        </div>
        <Submit idle="Enregistrer" busy="Enregistrement…" disabled={mismatch || passwordStrength(password) === 0} />
      </motion.form>
      {state.status === "error" && (
        <motion.div variants={item} className="mt-4">
          <ErrorText>{state.message}</ErrorText>
        </motion.div>
      )}
    </Shell>
  );
}
