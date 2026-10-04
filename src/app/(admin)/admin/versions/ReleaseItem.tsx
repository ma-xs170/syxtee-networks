"use client";

import { useActionState, useState } from "react";
import { editReleaseAction, resendReleaseAction, type ReleaseState } from "./actions";

const field = "w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const link = "whitespace-nowrap text-sm text-muted underline-offset-4 hover:text-foreground hover:underline";

type Props = { id: string; version: string; title: string; notes: string; meta: string; sent: boolean };

export default function ReleaseItem({ id, version, title, notes, meta, sent }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ReleaseState, FormData>(editReleaseAction, {});

  if (editing) {
    return (
      <li className="py-3">
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <p className="font-mono text-xs text-muted">v{version} · le numéro ne change pas</p>
          <div className="space-y-2">
            <label htmlFor={`t-${id}`} className="text-xs text-muted">Titre</label>
            <input id={`t-${id}`} name="title" defaultValue={title} required maxLength={120} className={`${field} h-11`} />
          </div>
          <div className="space-y-2">
            <label htmlFor={`n-${id}`} className="text-xs text-muted">Notes de version</label>
            <textarea id={`n-${id}`} name="notes" defaultValue={notes} required rows={8} maxLength={3500} className={`${field} py-3`} />
          </div>
          {state.error && <p role="alert" className="text-sm text-red-400/90">{state.error}</p>}
          {state.ok && <p role="status" className="text-sm text-muted">{state.ok}</p>}
          <div className="flex items-center gap-4">
            <button type="submit" disabled={pending} className="h-10 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60">
              {pending ? "Enregistrement…" : sent ? "Enregistrer et mettre à jour Discord" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={link}>Fermer</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            <span className="font-mono">v{version}</span> · {title}
          </p>
          <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted">{notes}</p>
          <p className="mt-1.5 font-mono text-xs uppercase text-muted">{meta}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button type="button" onClick={() => setEditing(true)} className={link}>Modifier</button>
          <form action={resendReleaseAction}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className={link}>{sent ? "Renvoyer" : "Envoyer"}</button>
          </form>
        </div>
      </div>
    </li>
  );
}
