"use client";

import { useState, useTransition } from "react";
import { startCheckout } from "@/app/(dashboard)/dashboard/abonnement/actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { CATALOG, INTERVALS, PROD_TIERS, PRODUCTION, TIERS, type Interval, type PaidTier } from "@/lib/billing";

/** Choix de formule : un bouton par formule, qui ouvre Stripe Checkout. L'action redirige en cas de succès, sinon on affiche la raison. */
export default function PlanPicker({ current = null, production = false }: { current?: PaidTier | null; production?: boolean }) {
  const toast = useToast();
  const [interval, setInterval] = useState<Interval>("month");
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<PaidTier | null>(null);

  const choose = (tier: PaidTier) => {
    setChosen(tier);
    start(async () => {
      const r = await startCheckout(tier, interval);
      if (r?.error) toast(r.error, "error");
    });
  };

  return (
    <div>
      <div role="group" aria-label="Périodicité" className="mb-4 inline-flex rounded-full border border-line p-0.5 text-[13px]">
        {(Object.keys(INTERVALS) as Interval[]).map((i) => (
          <button
            key={i}
            type="button"
            aria-pressed={interval === i}
            onClick={() => setInterval(i)}
            className={`rounded-full px-3.5 py-1.5 transition-colors ${interval === i ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
          >
            {INTERVALS[i].label}
            {INTERVALS[i].note && <span className="ml-1.5 font-mono text-[11px] opacity-70">{INTERVALS[i].note}</span>}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {TIERS.map((t) => {
          const c = CATALOG[t];
          return (
            <div key={t} className={`flex flex-col rounded-2xl border p-5 ${c.featured ? "border-foreground/40" : "border-line"}`}>
              <p className="text-[15px] font-semibold">{c.name}</p>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="whitespace-nowrap text-[26px] font-semibold tracking-tight">{c.prices[interval].amount}</span>
                <span className="text-[13px] text-muted">{INTERVALS[interval].per}</span>
              </p>
              <p className="mt-2 min-h-[3rem] text-[13px] leading-relaxed text-muted">{c.pitch}</p>
              {current === t ? (
                <p className="mt-4 grid h-10 place-items-center rounded-[10px] border border-line text-[14px] text-muted">Formule actuelle</p>
              ) : (
                <Button variant={c.featured && !current ? "primary" : "secondary"} className="mt-4 w-full" loading={pending && chosen === t} disabled={pending} onClick={() => choose(t)}>
                  {current ? `Passer à ${c.name}` : `Choisir ${c.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {production && (
        <>
          <h3 className="mb-1 mt-8 text-[15px] font-semibold">Production (équipes)</h3>
          <p className="mb-3 text-[13px] text-muted">Un espace partagé avec ses streamers, ses vidéastes et un planning commun.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {PROD_TIERS.map((t) => {
              const c = PRODUCTION[t];
              return (
                <div key={t} className={`flex flex-col rounded-2xl border p-5 ${c.featured ? "border-foreground/40" : "border-line"}`}>
                  <p className="text-[15px] font-semibold">{c.name}</p>
                  <p className="mt-3 flex items-baseline gap-1.5">
                    <span className="whitespace-nowrap text-[26px] font-semibold tracking-tight">{c.prices[interval].amount}</span>
                    <span className="text-[13px] text-muted">{INTERVALS[interval].per}</span>
                  </p>
                  <p className="mt-2 font-mono text-[12px] uppercase text-muted">{c.streamers} streamers · {c.videographers} vidéastes</p>
                  <p className="mt-2 min-h-[3rem] text-[13px] leading-relaxed text-muted">{c.pitch}</p>
                  {current === t ? (
                    <p className="mt-4 grid h-10 place-items-center rounded-[10px] border border-line text-[14px] text-muted">Formule actuelle</p>
                  ) : (
                    <Button variant="secondary" className="mt-4 w-full" loading={pending && chosen === t} disabled={pending} onClick={() => choose(t)}>
                      {current ? `Passer à ${c.name}` : `Choisir ${c.name}`}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
