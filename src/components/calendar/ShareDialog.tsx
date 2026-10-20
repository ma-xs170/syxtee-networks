"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, UploadSimple } from "@phosphor-icons/react";
import { siGoogle } from "@/lib/brand-icons";
import { buttonClass } from "@/components/ui/button-styles";

// Partage du calendrier : un lien en lecture seule (page publique) et le flux d'abonnement pour l'agenda de ceux qui l'ont.
// Retirer ou renouveler le lien coupe l'accès de tous ceux qui avaient l'ancien.

const field = "h-11 w-full rounded-lg border border-line bg-background px-3 font-mono text-xs text-foreground focus:border-foreground/60 focus:outline-none";

export default function ShareDialog({
  open,
  token,
  onClose,
  onShare,
  onUnshare,
}: {
  open: boolean;
  token: string | null;
  onClose: () => void;
  onShare: (renew: boolean) => Promise<string | null>;
  onUnshare: () => Promise<string | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<"page" | "feed" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      setError("");
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const page = token && origin ? `${origin}/calendrier/${token}` : "";
  const feed = page ? `${page}/live.ics` : "";
  const webcal = feed.replace(/^https?:/, "webcal:");

  async function run(fn: () => Promise<string | null>) {
    setBusy(true);
    setError("");
    const err = await fn();
    if (err) setError(err);
    setBusy(false);
  }
  async function copy(what: "page" | "feed", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Copie impossible : sélectionne le lien et copie-le à la main.");
    }
  }

  const row = (what: "page" | "feed", label: string, value: string, hint: string) => (
    <div className="grid gap-1.5">
      <label className="text-sm text-muted" htmlFor={`share-${what}`}>
        {label}
      </label>
      <div className="flex gap-2">
        <input id={`share-${what}`} readOnly value={value} onFocus={(e) => e.currentTarget.select()} className={field} />
        <button type="button" onClick={() => copy(what, value)} className={buttonClass("secondary", "shrink-0")} aria-label={`Copier : ${label}`}>
          {copied === what ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied === what ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );

  return (
    <dialog ref={dialog} onClose={onClose} onClick={(e) => e.target === dialog.current && dialog.current?.close()} aria-labelledby="share-title" className="m-auto w-[min(46rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-background p-0 text-foreground backdrop:bg-black/70">
      <div className="grid gap-5 p-6">
        <div>
          <h2 id="share-title" className="text-lg font-semibold tracking-tight">
            Partager le calendrier
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">Un lien en lecture seule : tes potes voient tes prochains lives et peuvent les ajouter à leur agenda. Ils ne peuvent rien modifier.</p>
        </div>
        {token ? (
          <>
            {row("page", "Lien du calendrier", page, "À envoyer tel quel : il s'ouvre dans le navigateur, sans compte.")}
            <div className="grid gap-3">
              <div>
                <h3 className="text-base font-semibold tracking-tight">Exporter vers le calendrier</h3>
                <p className="mt-0.5 text-sm text-muted">Tes potes ajoutent tes lives à leur agenda, qui se met à jour tout seul.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col items-center gap-3 rounded-xl border border-line p-5 text-center">
                  <svg viewBox="0 0 24 24" width={44} height={44} fill={`#${siGoogle.hex}`} aria-hidden="true">
                    <path d={siGoogle.path} />
                  </svg>
                  <h4 className="text-sm font-semibold">S&apos;abonner via Google Agenda</h4>
                  <p className="text-xs leading-relaxed text-muted">Exporte ce calendrier vers Google Agenda en un clic.</p>
                  <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "mt-auto w-full")}>
                    Exporter vers Google Agenda
                  </a>
                </div>
                <div className="flex flex-col items-center gap-3 rounded-xl border border-line p-5 text-center">
                  <UploadSimple size={44} aria-hidden="true" />
                  <h4 className="text-sm font-semibold">S&apos;abonner manuellement avec n&apos;importe quel agenda</h4>
                  <p className="text-xs leading-relaxed text-muted">Apple Calendrier, Outlook, etc. : ajoute-le comme « calendrier par abonnement ».</p>
                  <div className="mt-auto flex w-full gap-2">
                    <input aria-label="Lien d'abonnement" readOnly value={webcal} onFocus={(e) => e.currentTarget.select()} className={field} />
                    <button type="button" onClick={() => copy("feed", webcal)} className={buttonClass("secondary", "shrink-0")} aria-label="Copier le lien d'abonnement">
                      {copied === "feed" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                      {copied === "feed" ? "Copié" : "Copier"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <button type="button" disabled={busy} onClick={() => run(() => onShare(true))} className={buttonClass("secondary")}>
                Nouveau lien
              </button>
              <button type="button" disabled={busy} onClick={() => run(onUnshare)} className={buttonClass("danger")}>
                Arrêter le partage
              </button>
              <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("ghost", "ml-auto")}>
                Fermer
              </button>
            </div>
            <p className="-mt-2 text-xs text-muted">« Nouveau lien » ou « Arrêter le partage » coupe l&apos;accès de tous ceux qui ont l&apos;ancien lien.</p>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => run(() => onShare(false))} className={buttonClass("primary")}>
              {busy ? "Création…" : "Créer le lien de partage"}
            </button>
            <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("ghost", "ml-auto")}>
              Fermer
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}
      </div>
    </dialog>
  );
}
