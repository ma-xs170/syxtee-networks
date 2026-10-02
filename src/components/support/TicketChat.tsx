"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";

// Fil de discussion d'un ticket (espace client et admin). Les messages de celui qui regarde sont à droite, ceux de
// l'autre à gauche. La page se rafraîchit toute seule toutes les 10 s tant qu'elle est visible ; Entrée envoie,
// Maj + Entrée passe à la ligne.

export type ChatMessage = { id: string; from_staff: boolean; body: string; created_at: string; name: string };
type ReplyState = { error?: string };

const time = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export default function TicketChat({
  messages,
  viewer,
  action,
  hint,
}: {
  messages: ChatMessage[];
  viewer: "user" | "staff";
  action: (prev: ReplyState, form: FormData) => Promise<ReplyState>;
  hint?: string;
}) {
  const router = useRouter();
  const [state, run, pending] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1]?.id;

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 10_000);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [last]);

  useEffect(() => {
    if (!pending && !state.error) form.current?.reset();
  }, [pending, state]);

  return (
    <div>
      <ul className="space-y-5" aria-live="polite">
        {messages.map((m) => {
          const mine = (viewer === "staff") === m.from_staff;
          return (
            <li key={m.id} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
              <p className="px-1 text-xs text-muted">{mine ? "Toi" : m.name}</p>
              <p
                className={`max-w-[min(34rem,85%)] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  mine ? "rounded-br-md bg-accent text-on-accent" : "rounded-bl-md border border-line bg-surface"
                }`}
              >
                {m.body}
              </p>
              <p className="px-1 font-mono text-[11px] text-muted">{time(m.created_at)}</p>
            </li>
          );
        })}
      </ul>
      <div ref={end} />

      <form ref={form} action={run} className="mt-8">
        <div className="rounded-2xl border border-line bg-surface p-3 focus-within:border-line-strong">
          <label htmlFor="reply" className="sr-only">
            Ton message
          </label>
          <textarea
            id="reply"
            name="body"
            rows={3}
            maxLength={4000}
            required
            placeholder="Écris ton message"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                form.current?.requestSubmit();
              }
            }}
            className="block w-full resize-none bg-transparent px-1 text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted">{hint ?? "Entrée pour envoyer, Maj + Entrée pour un retour à la ligne."}</p>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-accent px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              <PaperPlaneTilt size={16} aria-hidden="true" />
              {pending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </div>
        {state.error && (
          <p role="alert" className="mt-2 text-sm text-red-400/90">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
