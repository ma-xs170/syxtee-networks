"use client";

import { useActionState, useState } from "react";
import { createTicketAction, type SupportState } from "@/app/(dashboard)/dashboard/support/actions";
import { CATEGORY_FORMS, SUPPORT_CATEGORIES, isCategory, type SupportCategory } from "@/lib/support-categories";
import PhotoPicker from "./PhotoPicker";

const field = "w-full rounded-xl border border-line bg-surface px-4 text-sm text-foreground placeholder:text-muted focus:border-line-strong focus:outline-none";

export type PersonInfo = { name: string; email: string; supportId: string; plan: string; country: string };

// Demande d'assistance en deux pages. Page 1 : le sujet (liste déroulante) et les informations du compte, préremplies.
// Page 2 : les champs propres au sujet choisi, le message et les photos. Les deux pages restent dans le même formulaire
// (la page 1 est seulement masquée) : tout est envoyé en une fois.
export default function NewTicketForm({ person }: { person: PersonInfo }) {
  const [state, action, pending] = useActionState<SupportState, FormData>(createTicketAction, {});
  const [page, setPage] = useState<1 | 2>(1);
  const [category, setCategory] = useState<SupportCategory | "">("");
  const cfg = category ? CATEGORY_FORMS[category] : null;
  const info: [string, string][] = [
    ["Nom", person.name],
    ["Adresse e-mail", person.email],
    ["ID support", person.supportId],
    ["Formule", person.plan],
    ["Pays", person.country],
  ];

  return (
    <form action={action} className="max-w-3xl">
      <input type="hidden" name="category" value={category} />

      <p className="mb-6 flex items-center gap-3 text-sm text-muted">
        <span className="font-medium text-foreground">Page {page} sur 2</span>
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-1 w-8 rounded-full bg-foreground" />
          <span className={`h-1 w-8 rounded-full ${page === 2 ? "bg-foreground" : "bg-foreground/15"}`} />
        </span>
      </p>

      {/* Page 1 */}
      <div hidden={page !== 1} className="space-y-8">
        <div className="space-y-2">
          <label htmlFor="t-cat" className="text-sm font-medium">Sujet de ta demande</label>
          <select id="t-cat" value={category} onChange={(e) => setCategory(isCategory(e.target.value) ? e.target.value : "")} className={`${field} h-12`}>
            <option value="">Choisis un sujet</option>
            {SUPPORT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <p className="min-h-5 text-xs text-muted">{category ? SUPPORT_CATEGORIES.find((c) => c.id === category)?.hint : "Le formulaire s'adapte au sujet choisi."}</p>
        </div>

        <section aria-labelledby="t-info" className="rounded-2xl border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <h2 id="t-info" className="text-sm font-semibold">Tes informations</h2>
            <span className="text-xs text-muted">Préremplies automatiquement</span>
          </div>
          <dl className="divide-y divide-line px-5 text-sm">
            {info.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-6 py-3">
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 truncate text-right font-medium" data-sensitive>{v || "Non renseigné"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <button type="button" disabled={!category} onClick={() => setPage(2)} className="h-11 whitespace-nowrap rounded-full btn-tonal px-6 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50">
          Continuer
        </button>
      </div>

      {/* Page 2 */}
      <div hidden={page !== 2} className="space-y-8">
        {cfg && (
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{cfg.title}</h2>
            <p className="mt-1 text-sm text-muted">{cfg.intro}</p>
          </div>
        )}

        {cfg && cfg.fields.length > 0 && (
          <section aria-labelledby="t-details" className="space-y-4">
            <h3 id="t-details" className="text-sm font-medium">Les détails</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cfg.fields.map((f) => (
                <div key={`${category}-${f.name}`} className="space-y-2">
                  <label htmlFor={`f_${f.name}`} className="text-sm text-muted">
                    {f.label}
                    {f.required ? " *" : <span className="text-muted/70"> (facultatif)</span>}
                  </label>
                  {f.type === "select" ? (
                    <select id={`f_${f.name}`} name={`f_${f.name}`} required={f.required && page === 2} defaultValue="" className={`${field} h-11`}>
                      <option value="" disabled={f.required}>{f.required ? "Choisis" : "Non précisé"}</option>
                      {f.options?.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input id={`f_${f.name}`} name={`f_${f.name}`} required={f.required && page === 2} maxLength={200} placeholder={f.placeholder} className={`${field} h-11`} />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="t-msg" className="space-y-5">
          <h3 id="t-msg" className="text-sm font-medium">Ta demande</h3>
          <div className="space-y-2">
            <label htmlFor="t-subject" className="text-sm text-muted">Sujet *</label>
            <input id="t-subject" name="subject" required={page === 2} minLength={3} maxLength={120} placeholder={cfg?.subjectPlaceholder} className={`${field} h-11`} />
          </div>
          <div className="space-y-2">
            <label htmlFor="t-body" className="text-sm text-muted">{cfg?.messageLabel ?? "Ton message"}</label>
            <textarea id="t-body" name="body" rows={7} maxLength={3500} placeholder={cfg?.messagePlaceholder} className={`${field} py-3`} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted">Photos (captures d&apos;écran, réglages)</p>
            <PhotoPicker />
          </div>
          <p className="text-xs text-muted">Ne mets jamais ton mot de passe ni tes clés de stream dans un message ou une photo.</p>
        </section>

        {cfg && (
          <ul className="space-y-2 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
            {cfg.tips.map((t) => (
              <li key={t} className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>{t}</li>
            ))}
          </ul>
        )}

        {state.error && (
          <p role="alert" className="text-sm text-bad">
            {state.error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setPage(1)} className="h-11 whitespace-nowrap rounded-full border border-line-strong px-6 text-sm font-medium transition-colors hover:bg-foreground/[0.08]">
            Retour
          </button>
          <button type="submit" disabled={pending || !category} className="h-11 whitespace-nowrap rounded-full btn-tonal px-6 text-sm font-medium transition-colors disabled:opacity-60">
            {pending ? "Envoi…" : "Envoyer ma demande"}
          </button>
          <p className="text-xs text-muted">Réponse rapide, généralement sous 24 h.</p>
        </div>
      </div>
    </form>
  );
}
