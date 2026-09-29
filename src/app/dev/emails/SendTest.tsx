"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendTest, type TestState } from "./actions";

function Button({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-10 whitespace-nowrap rounded-full border border-line px-4 text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50">
      {pending ? "Envoi…" : label}
    </button>
  );
}

export default function SendTest({ emailKey, label = "M'envoyer un test" }: { emailKey: string; label?: string }) {
  const [state, action] = useActionState<TestState, FormData>(sendTest, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="key" value={emailKey} />
      <Button label={label} />
      {state.ok && <span className="text-sm text-muted">{state.ok}</span>}
      {state.error && (
        <span role="alert" className="text-sm text-red-400/90">
          {state.error}
        </span>
      )}
    </form>
  );
}
