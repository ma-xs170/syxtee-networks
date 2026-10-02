"use client";

import { useActionState } from "react";
import { banAction, type BanState } from "@/app/(dashboard)/admin/securite/actions";

// Bannir une IP à la main (en plus des bannissements automatiques de 15 min après 10 refus en 1 min).

const field = "h-11 w-full rounded-full border border-line bg-background px-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";

export default function BanForm({ ip = "" }: { ip?: string }) {
  const [state, action, pending] = useActionState<BanState, FormData>(banAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1.4fr_0.8fr_2fr_auto] sm:items-end">
      <div className="grid gap-2">
        <label htmlFor="ban-ip" className="font-mono text-xs uppercase tracking-[0.15em] text-muted">IP</label>
        <input id="ban-ip" name="ip" required defaultValue={ip} placeholder="203.0.113.7" className={`${field} font-mono`} />
      </div>
      <div className="grid gap-2">
        <label htmlFor="ban-min" className="font-mono text-xs uppercase tracking-[0.15em] text-muted">Durée</label>
        <select id="ban-min" name="minutes" defaultValue="1440" className={field}>
          <option value="60">1 h</option>
          <option value="1440">24 h</option>
          <option value="10080">7 jours</option>
          <option value="525600">1 an</option>
        </select>
      </div>
      <div className="grid gap-2">
        <label htmlFor="ban-reason" className="font-mono text-xs uppercase tracking-[0.15em] text-muted">Raison</label>
        <input id="ban-reason" name="reason" required maxLength={200} placeholder="Essais répétés sur des clés inventées" className={field} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-11 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "…" : "Bannir"}
      </button>
      <p role="status" className="text-sm sm:col-span-4">
        {state.error ? <span className="text-foreground">{state.error}</span> : state.ok ? <span className="text-muted">{state.ok}</span> : null}
      </p>
    </form>
  );
}
