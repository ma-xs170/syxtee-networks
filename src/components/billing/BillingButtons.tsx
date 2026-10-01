"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { openPortal, startCheckout, type BillingState } from "@/app/(dashboard)/dashboard/abonnement/actions";
import type { Interval, Tier } from "@/lib/billing";

// Boutons de la page Abonnement : « S'abonner » (Checkout), « Gérer mon abonnement » (portail), et l'attente
// de l'activation au retour de Stripe (la page se rafraîchit jusqu'à ce que le webhook ait fait passer le compte en Payant).

function Submit({ children, primary }: { children: string; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`h-11 w-full whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors active:scale-[0.98] disabled:opacity-60 ${
        primary ? "bg-accent text-on-accent hover:bg-accent-hover" : "border border-line text-foreground hover:bg-accent/10"
      }`}
    >
      {pending ? "Ouverture de Stripe…" : children}
    </button>
  );
}

const BillingError = ({ state }: { state: BillingState }) =>
  state.error ? (
    <p role="alert" className="mt-3 text-sm text-red-400/90">
      {state.error}
    </p>
  ) : null;

export function SubscribeButton({ tier, interval, label, primary }: { tier: Tier; interval: Interval; label: string; primary?: boolean }) {
  const [state, action] = useActionState<BillingState, FormData>(() => startCheckout(tier, interval), {});
  return (
    <form action={action}>
      <Submit primary={primary}>{label}</Submit>
      <BillingError state={state} />
    </form>
  );
}

export function PortalButton() {
  const [state, action] = useActionState<BillingState, FormData>(() => openPortal(), {});
  return (
    <form action={action} className="max-w-xs">
      <Submit>Gérer mon abonnement</Submit>
      <BillingError state={state} />
    </form>
  );
}

/** Retour de Stripe : rafraîchit toutes les 2 s (1 min au plus) en attendant le webhook. */
export function ActivationPending() {
  const router = useRouter();
  const [late, setLate] = useState(false);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      if (Date.now() - start > 60_000) {
        setLate(true);
        clearInterval(t);
      } else router.refresh();
    }, 2000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <div role="status" className="mb-6 rounded-2xl border border-line px-5 py-4 text-sm">
      {late ? "Paiement reçu. L'activation prend plus de temps que prévu : recharge la page dans quelques minutes, ou écris-nous sur Discord." : "Paiement reçu, activation de ta formule…"}
    </div>
  );
}
