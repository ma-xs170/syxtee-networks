"use client";

import { useActionState } from "react";
import { createTicketAction, type SupportState } from "@/app/(dashboard)/dashboard/support/actions";
import { CATEGORY_FORMS, type SupportCategory } from "@/lib/support-categories";
import PhotoPicker from "./PhotoPicker";

const field = "w-full rounded-xl border border-line bg-surface px-4 text-sm text-foreground placeholder:text-muted focus:border-line-strong focus:outline-none";

// Formulaire d'une demande, propre à sa catégorie : des champs précis (appareil, réseau, page…), puis le message libre et les photos.
export default function NewTicketForm({ category }: { category: SupportCategory }) {
  const cfg = CATEGORY_FORMS[category];
  const [state, action, pending] = useActionState<SupportState, FormData>(createTicketAction, {});
  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="category" value={category} />

      {cfg.fields.length > 0 && (
        <section aria-labelledby="t-details" className="space-y-4">
          <h2 id="t-details" className="text-sm font-medium">Les détails</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cfg.fields.map((f) => (
              <div key={f.name} className="space-y-2">
                <label htmlFor={`f_${f.name}`} className="text-sm text-muted">
                  {f.label}
                  {f.required ? " *" : <span className="text-muted/70"> (facultatif)</span>}
                </label>
                {f.type === "select" ? (
                  <select id={`f_${f.name}`} name={`f_${f.name}`} required={f.required} defaultValue="" className={`${field} h-11`}>
                    <option value="" disabled={f.required}>{f.required ? "Choisis" : "Non précisé"}</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input id={`f_${f.name}`} name={`f_${f.name}`} required={f.required} maxLength={200} placeholder={f.placeholder} className={`${field} h-11`} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="t-msg" className="space-y-5">
        <h2 id="t-msg" className="text-sm font-medium">Ta demande</h2>
        <div className="space-y-2">
          <label htmlFor="t-subject" className="text-sm text-muted">Sujet *</label>
          <input id="t-subject" name="subject" required minLength={3} maxLength={120} placeholder={cfg.subjectPlaceholder} className={`${field} h-11`} />
        </div>
        <div className="space-y-2">
          <label htmlFor="t-body" className="text-sm text-muted">{cfg.messageLabel}</label>
          <textarea id="t-body" name="body" rows={7} maxLength={3500} placeholder={cfg.messagePlaceholder} className={`${field} py-3`} />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted">Photos (captures d&apos;écran, réglages)</p>
          <PhotoPicker />
        </div>
        <p className="text-xs text-muted">Ne mets jamais ton mot de passe ni tes clés de stream dans un message ou une photo.</p>
      </section>

      {state.error && (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="h-11 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60">
          {pending ? "Envoi…" : "Envoyer ma demande"}
        </button>
        <p className="text-xs text-muted">Réponse rapide, généralement sous 24 h.</p>
      </div>
    </form>
  );
}
