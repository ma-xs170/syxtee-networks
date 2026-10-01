"use client";

import Link from "next/link";
import { useState } from "react";
import { CATALOG, INTERVALS, TIERS, type Interval } from "@/lib/billing";
import { SubscribeButton } from "./BillingButtons";

// Les 3 formules vendues, avec la bascule Mensuel / Annuel. `signup` (site public) : lien vers l'inscription ;
// `subscribe` (dashboard) : bouton qui ouvre Stripe Checkout.

export default function PlanCards({ mode }: { mode: "signup" | "subscribe" }) {
  const [interval, setInterval] = useState<Interval>("month");
  return (
    <div>
      <div role="radiogroup" aria-label="Périodicité" className="inline-flex gap-1 rounded-full border border-line p-1">
        {(["month", "year"] as Interval[]).map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={interval === i}
            onClick={() => setInterval(i)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${interval === i ? "bg-white text-black" : "text-muted hover:text-foreground"}`}
          >
            {INTERVALS[i].label}
            {INTERVALS[i].note && <span className={`ml-2 font-mono text-[10px] uppercase tracking-[0.12em] ${interval === i ? "text-black/60" : "text-muted"}`}>{INTERVALS[i].note}</span>}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {TIERS.map((t) => {
          const c = CATALOG[t];
          return (
            <div key={t} className={`flex flex-col rounded-2xl border p-6 ${c.featured ? "border-white/50" : "border-line"}`}>
              <p className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs uppercase tracking-[0.15em]">{c.name}</span>
                {c.featured && <span className="rounded border border-white/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">Recommandé</span>}
              </p>
              <p className="mt-2 text-sm text-muted">{c.pitch}</p>
              <p className="mt-6 text-4xl font-semibold tracking-tight tabular-nums">{c.prices[interval].amount}</p>
              <p className="text-sm text-muted">{INTERVALS[interval].per}, sans engagement</p>
              <ul className="mb-8 mt-6 grid gap-2 text-sm">
                {c.points.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span aria-hidden="true" className="text-muted">
                      +
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                {mode === "subscribe" ? (
                  <SubscribeButton tier={t} interval={interval} label={`Choisir ${c.name}`} primary={c.featured} />
                ) : (
                  <Link
                    href="/inscription?next=/dashboard/abonnement"
                    className={`inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors ${
                      c.featured ? "bg-white text-black hover:bg-neutral-200" : "border border-line hover:bg-white/5"
                    }`}
                  >
                    {`Choisir ${c.name}`}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
