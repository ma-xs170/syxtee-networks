"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { generateCodesAction, type CodesState } from "./actions";

export default function CodesForm() {
  const [state, action, pending] = useActionState<CodesState, FormData>(generateCodesAction, {});
  return (
    <form action={action} className="grid gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Input label="Nombre de codes" name="count" type="number" min={1} max={50} defaultValue={1} required className="!w-32" />
        <Input label="Mois offerts (Extra)" name="months" type="number" min={1} max={24} defaultValue={4} required className="!w-40" />
        <Input label="Note (commande, client)" name="note" maxLength={120} className="!w-72" />
        <Button type="submit" loading={pending}>Générer</Button>
      </div>
      {state.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      {state.ok && (
        <div role="status" className="rounded-xl border border-ok/30 bg-ok/10 p-4 text-sm">
          <p className="text-ok">{state.ok} Copie-les maintenant : ils restent aussi listés ci-dessous.</p>
          <ul className="mt-3 flex flex-wrap gap-2">{state.codes?.map((c) => <li key={c} className="rounded-lg border border-line-strong bg-surface-2 px-3 py-1.5 font-mono tabular-nums">{c}</li>)}</ul>
        </div>
      )}
    </form>
  );
}
