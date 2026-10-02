"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { eraseMeasuresAction, type EraseState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-9 whitespace-nowrap rounded-full border border-red-400/40 px-4 text-xs font-medium text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50">
      {pending ? "…" : "Effacer ses mesures"}
    </button>
  );
}

export default function EraseMeasures({ userId }: { userId: string }) {
  const [state, action] = useActionState<EraseState, FormData>(eraseMeasuresAction, {});
  return (
    <form action={action} onSubmit={(e) => !window.confirm("Effacer toutes les mesures de ce compte ? La carte sera recalculée.") && e.preventDefault()} className="inline-flex items-center gap-3">
      <input type="hidden" name="userId" value={userId} />
      {state.ok ? <span className="text-xs text-muted">{state.ok}</span> : <Submit />}
      {state.error && <span role="alert" className="text-xs text-red-400/90">{state.error}</span>}
    </form>
  );
}
