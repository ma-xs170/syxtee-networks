"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ASSIGNABLE, PLANS, type PlanId } from "@/lib/plans";
import { offerDaysAction, setPlanAction, type PlanState } from "./actions";

const field = "h-11 w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const label = "text-xs text-muted";

function Submit({ idle }: { idle: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-11 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60">
      {pending ? "Enregistrement…" : idle}
    </button>
  );
}

function Notice({ state }: { state: PlanState }) {
  if (state.error) return <p role="alert" className="text-sm text-bad">{state.error}</p>;
  if (state.ok) return <p role="status" className="text-sm text-muted">{state.ok}</p>;
  return null;
}

export default function PlanForms({ userId, plan, until, note }: { userId: string; plan: string; until: string | null; note: string | null }) {
  const [planState, planAction] = useActionState<PlanState, FormData>(setPlanAction, {});
  const [offerState, offerAction] = useActionState<PlanState, FormData>(offerDaysAction, {});
  const current = (ASSIGNABLE as string[]).includes(plan) ? plan : "free";
  return (
    <div className="space-y-8">
      <form action={planAction} className="grid gap-4">
        <input type="hidden" name="userId" value={userId} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="plan" className={label}>
              Formule
            </label>
            <select id="plan" name="plan" defaultValue={current} className={field}>
              {ASSIGNABLE.map((p: PlanId) => (
                <option key={p} value={p}>
                  {PLANS[p].name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="until" className={label}>
              Expire le (facultatif)
            </label>
            <input id="until" name="until" type="date" defaultValue={until?.slice(0, 10) ?? ""} className={field} />
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="note" className={label}>
            Note interne
          </label>
          <input id="note" name="note" maxLength={200} defaultValue={note ?? ""} placeholder="Partenariat Saily, streamer ambassadeur…" className={field} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Submit idle="Enregistrer la formule" />
          <Notice state={planState} />
        </div>
      </form>

      <form action={offerAction} className="flex flex-wrap items-end gap-4 border-t border-line pt-6">
        <input type="hidden" name="userId" value={userId} />
        <div className="grid gap-2">
          <label htmlFor="days" className={label}>
            Offrir des jours de Premium
          </label>
          <input id="days" name="days" type="number" min={1} max={365} defaultValue={30} className={`${field} w-32`} />
        </div>
        <Submit idle="Offrir" />
        <Notice state={offerState} />
      </form>
    </div>
  );
}
