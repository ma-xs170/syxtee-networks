"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import Image from "next/image";
import { PaperPlaneTilt } from "@/components/icons";
import { ROLE_META, roleStyle, type AnyRole } from "@/lib/staff";
import PhotoPicker from "./PhotoPicker";

// Fil de discussion d'un ticket (espace client et admin). Les messages de celui qui regarde sont à droite, ceux de
// l'autre à gauche. La page se rafraîchit toute seule toutes les 10 s tant qu'elle est visible ; Entrée envoie,
// Maj + Entrée passe à la ligne.

export type ChatAuthor = { name: string; avatarUrl: string | null; role: AnyRole };
export type ChatMessage = {
  id: string;
  from_staff: boolean;
  body: string;
  created_at: string;
  name: string;
  photos?: { url: string; name: string }[];
  /** « system » : ligne d'information centrée (« Mathis a pris en charge votre demande »). */
  kind?: "message" | "system";
  /** Agent qui a écrit le message : photo, prénom et rôle encadré à côté du nom ; sa signature clôt le message. */
  author?: ChatAuthor;
  signature?: string | null;
};
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
  const scroller = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1]?.id;

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 10_000);
    return () => clearInterval(t);
  }, [router]);

  // Défilement interne : seul le fil descend au dernier message, la page ne bouge pas.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [last]);

  useEffect(() => {
    if (!pending && !state.error) form.current?.reset();
  }, [pending, state]);

  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface lg:h-[min(72dvh,46rem)]">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
      <ul className="space-y-5" aria-live="polite">
        {messages.map((m) => {
          const mine = (viewer === "staff") === m.from_staff;
          if (m.kind === "system")
            return (
              <li key={m.id} className="flex flex-col items-center gap-1 py-1">
                <p className="max-w-[min(34rem,92%)] rounded-full border border-line px-4 py-1.5 text-center text-xs leading-relaxed text-muted">{m.body}</p>
                <p className="font-mono text-[11px] text-muted/70">{time(m.created_at)}</p>
              </li>
            );
          const a = m.author;
          return (
            <li key={m.id} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
              {a ? (
                <p className={`flex items-center gap-2 px-1 text-xs text-muted ${mine ? "flex-row-reverse" : ""}`}>
                  {a.avatarUrl ? (
                    <Image src={a.avatarUrl} alt="" width={24} height={24} className="size-6 rounded-full border border-foreground/25 object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full border bg-gradient-to-br from-violet-500 to-pink-500 text-white font-mono text-[9px] uppercase">
                      {a.name.slice(0, 2)}
                    </span>
                  )}
                  <span className="font-medium text-foreground">{a.name}</span>
                  <span style={roleStyle(a.role)} className="rounded-md border px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {ROLE_META[a.role].short}
                  </span>
                </p>
              ) : (
                <p className="px-1 text-xs text-muted">{mine ? "Toi" : m.name}</p>
              )}
              {m.body && (
                <p
                  className={`max-w-[min(40rem,88%)] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    mine ? "rounded-br-md bg-accent text-on-accent" : "rounded-bl-md border border-line bg-surface"
                  }`}
                >
                  {m.body}
                </p>
              )}
              {m.signature && <p className="max-w-[min(40rem,88%)] px-1 text-xs italic text-muted">{m.signature}</p>}
              {!!m.photos?.length && (
                <div className={`flex max-w-[min(40rem,88%)] flex-wrap gap-2 ${mine ? "justify-end" : ""}`}>
                  {m.photos.map((ph) => (
                    <a key={ph.url} href={ph.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element -- URL signée du stockage, pas une image du site */}
                      <img src={ph.url} alt={ph.name || "Photo jointe"} loading="lazy" className="max-h-56 max-w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <p className="px-1 font-mono text-[11px] text-muted">{time(m.created_at)}</p>
            </li>
          );
        })}
      </ul>
      </div>

      <form ref={form} action={run} className="shrink-0 border-t border-line bg-background/60 p-2.5 sm:p-4">
        <div className="rounded-xl border border-line bg-surface p-2.5 focus-within:border-line-strong sm:p-3">
          <label htmlFor="reply" className="sr-only">
            Ton message
          </label>
          <textarea
            id="reply"
            name="body"
            rows={1}
            maxLength={4000}
            placeholder="Écris ton message"
            aria-label="Ton message"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                form.current?.requestSubmit();
              }
            }}
            className="block max-h-32 min-h-[2.75rem] w-full resize-none bg-transparent px-1 text-base text-foreground placeholder:text-muted focus:outline-none sm:text-sm"
          />
          <div className="flex items-center justify-between gap-3 pt-2">
            <PhotoPicker />
            <p className="hidden text-xs text-muted sm:block">{hint ?? "Entrée pour envoyer, Maj + Entrée pour un retour à la ligne."}</p>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg btn-tonal px-4 text-sm font-medium transition-colors disabled:opacity-60"
            >
              <PaperPlaneTilt size={16} aria-hidden="true" />
              {pending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </div>
        {state.error && (
          <p role="alert" className="mt-2 text-sm text-bad">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
