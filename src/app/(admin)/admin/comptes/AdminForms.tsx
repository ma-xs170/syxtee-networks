"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { addNoteAction, cutRelayAction, deleteAccountAction, keysAction, suspendAction, updateIdentityAction, type PlanState } from "./actions";

type Action = (prev: PlanState, form: FormData) => Promise<PlanState>;

const field = "h-11 w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const label = "font-mono text-xs uppercase tracking-[0.15em] text-muted";

function Button({ children, danger = false, disabled = false }: { children: ReactNode; danger?: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`h-11 whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        danger ? "border border-red-400/40 text-red-300 hover:bg-red-400/10" : "border border-line hover:bg-foreground/10"
      }`}
    >
      {pending ? "…" : children}
    </button>
  );
}

function Notice({ state }: { state: PlanState }) {
  if (state.error) return <p role="alert" className="text-sm text-red-400/90">{state.error}</p>;
  if (state.ok) return <p role="status" className="text-sm text-muted">{state.ok}</p>;
  return null;
}

/** Formulaire d'une action admin, avec confirmation navigateur facultative. */
function ActionForm({ action, userId, confirm, children, className = "flex flex-wrap items-center gap-3" }: { action: Action; userId: string; confirm?: string; children: ReactNode; className?: string }) {
  const [state, run] = useActionState<PlanState, FormData>(action, {});
  return (
    <form action={run} onSubmit={(e) => confirm && !window.confirm(confirm) && e.preventDefault()} className={className}>
      <input type="hidden" name="userId" value={userId} />
      {children}
      <Notice state={state} />
    </form>
  );
}

export function IdentityForm({ userId, first, last, email }: { userId: string; first: string; last: string; email: string }) {
  return (
    <ActionForm action={updateIdentityAction} userId={userId} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="adm-first" className={label}>Prénom</label>
          <input id="adm-first" name="first_name" defaultValue={first} required maxLength={50} className={field} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="adm-last" className={label}>Nom</label>
          <input id="adm-last" name="last_name" defaultValue={last} required maxLength={50} className={field} />
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="adm-email" className={label}>Email</label>
        <input id="adm-email" name="email" type="email" defaultValue={email} required className={field} />
      </div>
      <div>
        <Button>Enregistrer l&apos;identité</Button>
      </div>
    </ActionForm>
  );
}

export function KeysForms({ userId }: { userId: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <ActionForm action={keysAction} userId={userId} confirm="Régénérer toutes les clés ? Les flux en cours sont coupés et le client doit recoller ses URLs.">
        <input type="hidden" name="mode" value="regenerate" />
        <Button>Régénérer les clés</Button>
      </ActionForm>
      <ActionForm action={keysAction} userId={userId} confirm="Révoquer les clés ? Tous les relais du compte sont archivés.">
        <input type="hidden" name="mode" value="revoke" />
        <Button danger>Révoquer les clés</Button>
      </ActionForm>
    </div>
  );
}

export function CutButton({ userId, relayId }: { userId: string; relayId: string }) {
  return (
    <ActionForm action={cutRelayAction} userId={userId} confirm="Couper ce flux ? Une nouvelle clé est générée, le client doit recoller ses URLs.">
      <input type="hidden" name="relayId" value={relayId} />
      <Button danger>Couper le flux</Button>
    </ActionForm>
  );
}

export function SuspendForm({ userId, suspended }: { userId: string; suspended: boolean }) {
  return (
    <ActionForm action={suspendAction} userId={userId} confirm={suspended ? undefined : "Suspendre ce compte ? Tous ses flux sont coupés."}>
      <input type="hidden" name="suspend" value={suspended ? "0" : "1"} />
      <Button danger={!suspended}>{suspended ? "Réactiver le compte" : "Suspendre le compte"}</Button>
    </ActionForm>
  );
}

export function DeleteForm({ userId, supportId }: { userId: string; supportId: string }) {
  const [text, setText] = useState("");
  return (
    <ActionForm action={deleteAccountAction} userId={userId} confirm="Supprimer définitivement ce compte ? Cette action est irréversible." className="grid gap-3">
      <label htmlFor="adm-delete" className="text-sm text-muted">
        Tape <span className="font-mono text-foreground">{supportId}</span> pour confirmer
      </label>
      <input id="adm-delete" name="confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className={`${field} max-w-xs font-mono uppercase`} />
      <div>
        <Button danger disabled={text.trim().toUpperCase() !== supportId}>
          Supprimer le compte
        </Button>
      </div>
    </ActionForm>
  );
}

export function NoteForm({ userId }: { userId: string }) {
  return (
    <ActionForm action={addNoteAction} userId={userId} className="grid gap-3">
      <label htmlFor="adm-note" className="sr-only">Nouvelle note</label>
      <textarea id="adm-note" name="body" required maxLength={2000} rows={3} placeholder="Note interne (jamais visible par le client)" className={`${field} h-auto py-3`} />
      <div>
        <Button>Ajouter la note</Button>
      </div>
    </ActionForm>
  );
}
