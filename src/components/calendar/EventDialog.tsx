"use client";

import { useEffect, useRef, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { PLATFORMS, type LiveEvent, type PlatformId } from "@/lib/calendar";
import { buttonClass } from "@/components/ui/button-styles";
import { fromInput, HOUR, MIN, rangeLabel, toInput } from "./date";
import { platformNames, PlatformIcon } from "./parts";

// Fiche d'un live : création, modification (titre, dates, lieu, description, plateformes) ou simple lecture sur un calendrier partagé.

export type Draft = { id?: string; title: string; location: string; description: string; platforms: PlatformId[]; start: Date; end: Date };
export type DraftInput = Omit<LiveEvent, "id" | "starts_at" | "ends_at"> & { starts_at: string; ends_at: string };

const field = "h-11 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-foreground/60 focus:outline-none";

export default function EventDialog({
  draft,
  editable,
  onClose,
  onSave,
  onDelete,
}: {
  draft: Draft | null;
  editable: boolean;
  onClose: () => void;
  onSave: (d: DraftInput, id?: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [platforms, setPlatforms] = useState<PlatformId[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Nouvelle fiche : le formulaire repart des valeurs du live ouvert.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (!draft) {
      if (d.open) d.close();
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setTitle(draft.title);
    setLocation(draft.location);
    setDescription(draft.description);
    setPlatforms(draft.platforms);
    setStart(toInput(draft.start));
    setEnd(toInput(draft.end));
    setError("");
    setBusy(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!d.open) d.showModal();
  }, [draft]);

  const onStart = (v: string) => {
    // Comme Apple Calendrier : décaler le début garde la durée.
    const a = fromInput(start);
    const b = fromInput(end);
    const n = fromInput(v);
    setStart(v);
    if (a && b && n) setEnd(toInput(new Date(n.getTime() + (b.getTime() - a.getTime()))));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const a = fromInput(start);
    const b = fromInput(end);
    if (!title.trim()) return setError("Donne un titre à ce live.");
    if (!a || !b) return setError("Renseigne le début et la fin.");
    if (b.getTime() - a.getTime() < MIN) return setError("La fin doit être après le début.");
    if (b.getTime() - a.getTime() > 7 * 24 * HOUR) return setError("Un live dure 7 jours au plus.");
    setBusy(true);
    setError("");
    const err = await onSave({ title: title.trim(), location: location.trim(), description: description.trim(), platforms, starts_at: a.toISOString(), ends_at: b.toISOString() }, draft?.id);
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft?.id) return;
    setBusy(true);
    const err = await onDelete(draft.id);
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  const toggle = (id: PlatformId) => setPlatforms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const lock = !editable;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      aria-labelledby="live-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-background p-0 text-foreground backdrop:bg-black/70"
    >
      {draft && lock ? (
        <div className="p-6">
          <h2 id="live-title" className="text-xl font-semibold tracking-tight">
            {draft.title}
          </h2>
          <p className="mt-1 text-sm text-muted">{rangeLabel(draft.start, draft.end)}</p>
          {draft.platforms.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={`Plateformes : ${platformNames(draft)}`}>
              {draft.platforms.map((id) => (
                <li key={id} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs">
                  <PlatformIcon id={id} />
                  {PLATFORMS.find((p) => p.id === id)?.label}
                </li>
              ))}
            </ul>
          )}
          {draft.location && (
            <p className="mt-4 text-sm">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Lieu</span>
              <br />
              {draft.location}
            </p>
          )}
          {draft.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted">{draft.description}</p>}
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("secondary")}>
              Fermer
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4 p-6">
          <h2 id="live-title" className="text-lg font-semibold tracking-tight">
            {draft?.id ? "Modifier le live" : "Nouveau live"}
          </h2>
          <label className="grid gap-1.5 text-sm text-muted">
            Titre
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Ex. Just Chatting, tournoi, IRL à Paris…" className={field} autoFocus />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1.5 text-sm text-muted">
              Début
              <input type="datetime-local" value={start} onChange={(e) => onStart(e.target.value)} required step={300} className={field} />
            </label>
            <label className="grid min-w-0 gap-1.5 text-sm text-muted">
              Fin
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required step={300} min={start} className={field} />
            </label>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm text-muted">Plateformes (une ou plusieurs)</legend>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const on = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(p.id)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors ${on ? "border-foreground bg-foreground/[0.09] text-foreground" : "border-line text-muted hover:border-foreground/30 hover:text-foreground"}`}
                  >
                    <PlatformIcon id={p.id} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className="grid gap-1.5 text-sm text-muted">
            Lieu
            <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder="Ville, salon, studio, en ligne…" className={field} />
          </label>
          <label className="grid gap-1.5 text-sm text-muted">
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} placeholder="De quoi parle ce live, invités, programme…" className={`${field} h-auto resize-y py-2.5 leading-relaxed`} />
          </label>
          {error && (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {draft?.id && (
              <button type="button" onClick={remove} disabled={busy} className={buttonClass("danger", "mr-auto")}>
                <Trash size={16} aria-hidden="true" />
                Supprimer
              </button>
            )}
            <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("ghost", draft?.id ? "" : "ml-auto")}>
              Annuler
            </button>
            <button type="submit" disabled={busy} className={buttonClass("primary")}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
