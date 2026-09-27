"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { motion, type Variants } from "motion/react";
import { siDiscord, siGoogle, siTwitch, type SimpleIcon } from "simple-icons";
import { sendMagicLink, signInWithProvider, type MagicLinkState } from "@/app/(auth)/actions";

// Carte de connexion / inscription : OAuth (Twitch, Discord, Google) + lien magique par email.
// Les deux pages font la même chose (le lien magique crée le compte s'il n'existe pas) ; seuls les textes changent.

type Method = "twitch" | "discord" | "google" | "email";
const LAST_KEY = "syxtee:last-auth";
const RESEND_DELAY = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function readLast(): Method | null {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return v === "twitch" || v === "discord" || v === "google" || v === "email" ? v : null;
  } catch {
    return null;
  }
}
function remember(m: Method) {
  try {
    localStorage.setItem(LAST_KEY, m);
  } catch {
    // Stockage indisponible (navigation privée…) : pas de badge, rien d'autre.
  }
}
const subscribeNoop = () => () => {};
const useLastMethod = () => useSyncExternalStore(subscribeNoop, readLast, () => null);

const list: Variants = { show: { transition: { staggerChildren: 0.05 } } };
const item: Variants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } };

function BrandIcon({ icon }: { icon: SimpleIcon }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="currentColor" aria-hidden="true">
      <path d={icon.path} />
    </svg>
  );
}

function LastBadge() {
  return (
    <span className="absolute -top-2.5 right-3 rounded-full border border-white/15 bg-[#1a1a1a] px-2 py-0.5 text-[11px] leading-4 text-white/80">
      Dernière utilisée
    </span>
  );
}

function ProviderButton({ provider, icon, label, next, last, className = "" }: { provider: Exclude<Method, "email">; icon: SimpleIcon; label: string; next: string; last: boolean; className?: string }) {
  return (
    <form action={signInWithProvider} onSubmit={() => remember(provider)} className={`relative ${className}`}>
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="next" value={next} />
      <ProviderSubmit icon={icon} label={label} />
      {last && <LastBadge />}
    </form>
  );
}

function ProviderSubmit({ icon, label }: { icon: SimpleIcon; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 active:scale-[0.99] disabled:opacity-60"
    >
      <BrandIcon icon={icon} />
      <span className="whitespace-nowrap">{pending ? "Redirection…" : label}</span>
    </button>
  );
}

function EmailSubmit({ valid }: { valid: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!valid || pending}
      className="h-12 w-full rounded-xl bg-white text-sm font-medium text-black transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
    >
      {pending ? "Envoi…" : "Continuer avec l'email"}
    </button>
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
      className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:text-white/40 disabled:hover:bg-white/[0.04]"
    >
      <span className="tabular-nums">{pending ? "Envoi…" : left > 0 ? `Renvoyer (${left} s)` : "Renvoyer"}</span>
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

export default function AuthCard({ mode, next = "", error }: { mode: "connexion" | "inscription"; next?: string; error?: string | null }) {
  const [state, action] = useActionState<MagicLinkState, FormData>(sendMagicLink, { status: "idle" });
  const [email, setEmail] = useState("");
  // « Changer d'email » : on masque le résultat courant (chaque envoi renvoie un nouvel objet d'état).
  const [dismissed, setDismissed] = useState<MagicLinkState | null>(null);
  const last = useLastMethod();

  const sent = state.status === "sent" && dismissed !== state ? state : null;
  const valid = EMAIL_RE.test(email.trim());
  const message = state.status === "error" && dismissed !== state ? state.message : error;
  const nextQ = next ? `?next=${encodeURIComponent(next)}` : "";

  const logo = (
    <motion.div variants={item} className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] border border-white/10 bg-[#0a0a0a] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-8px_16px_rgba(0,0,0,0.6)]">
      <Image src="/logo-400.png" alt="SYXTEE" width={18} height={25} priority />
    </motion.div>
  );

  if (sent) {
    return (
      <motion.div key="sent" initial="hidden" animate="show" variants={list} className="w-full max-w-[420px] text-center">
        {logo}
        <motion.h1 variants={item} className="mt-8 text-3xl font-semibold tracking-tight">
          Vérifie ta boîte mail
        </motion.h1>
        <motion.p variants={item} className="mt-3 text-sm leading-relaxed text-white/60">
          Lien de connexion envoyé à <span className="font-medium text-white">{sent.email}</span>.
          <br />
          Il est valable 10 minutes.
        </motion.p>
        <motion.form variants={item} action={action} className="mt-8">
          <input type="hidden" name="email" value={sent.email} />
          <input type="hidden" name="next" value={next} />
          <ResendButton key={sent.at} at={sent.at} />
        </motion.form>
        <motion.button
          variants={item}
          type="button"
          onClick={() => setDismissed(state)}
          className="mt-4 text-sm text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          Changer d&apos;email
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div key="form" initial="hidden" animate="show" variants={list} className="w-full max-w-[420px]">
      {logo}
      <motion.h1 variants={item} className="mt-8 text-center text-3xl font-semibold tracking-tight">
        {mode === "connexion" ? "Connexion à SYXTEE" : "Crée ton compte SYXTEE"}
      </motion.h1>
      <motion.p variants={item} className="mt-3 text-center text-sm text-white/60">
        {mode === "connexion" ? (
          <>
            Pas encore de compte ?{" "}
            <Link href={`/inscription${nextQ}`} className="font-medium text-white hover:underline">
              Inscris-toi.
            </Link>
          </>
        ) : (
          <>
            Déjà un compte ?{" "}
            <Link href={`/connexion${nextQ}`} className="font-medium text-white hover:underline">
              Connecte-toi.
            </Link>
          </>
        )}
      </motion.p>

      <motion.div variants={item} className="mt-10 grid gap-3 sm:grid-cols-2">
        <ProviderButton provider="twitch" icon={siTwitch} label="Continuer avec Twitch" next={next} last={last === "twitch"} />
        <ProviderButton provider="discord" icon={siDiscord} label="Continuer avec Discord" next={next} last={last === "discord"} />
        <ProviderButton provider="google" icon={siGoogle} label="Continuer avec Google" next={next} last={last === "google"} className="sm:col-span-2" />
      </motion.div>

      <motion.div variants={item} className="my-8 flex items-center gap-4 text-xs text-white/40" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />
        ou
        <span className="h-px flex-1 bg-white/10" />
      </motion.div>

      <motion.form variants={item} action={action} onSubmit={() => remember("email")} className="relative space-y-3" noValidate>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email" className="block text-sm font-medium text-white/80">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@exemple.com"
          className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/35 transition-[border-color,box-shadow] focus:border-white/30 focus:outline-none focus:ring-4 focus:ring-white/[0.06]"
        />
        <div className="relative pt-1">
          <EmailSubmit valid={valid} />
          {last === "email" && <LastBadge />}
        </div>
      </motion.form>

      {message && (
        <motion.div variants={item} className="mt-4">
          <ErrorText>{message}</ErrorText>
        </motion.div>
      )}

      <motion.p variants={item} className="mt-10 text-center text-xs leading-relaxed text-white/45">
        En continuant, tu acceptes nos{" "}
        <Link href="/cgu" className="underline underline-offset-2 hover:text-white">
          Conditions d&apos;utilisation
        </Link>{" "}
        et notre{" "}
        <Link href="/confidentialite" className="underline underline-offset-2 hover:text-white">
          Politique de confidentialité
        </Link>
        .
      </motion.p>
    </motion.div>
  );
}
