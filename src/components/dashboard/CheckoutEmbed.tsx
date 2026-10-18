"use client";

import { useCallback, useMemo, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { embeddedClientSecret } from "@/app/(dashboard)/dashboard/abonnement/actions";
import type { Interval, Tier } from "@/lib/billing";

/** Formulaire de paiement Stripe affiché dans la page (pas de redirection). Couleurs et logo : Stripe Dashboard → Image de marque. */
export default function CheckoutEmbed({ publishableKey, tier, interval }: { publishableKey: string; tier: Tier; interval: Interval }) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const r = await embeddedClientSecret(tier, interval);
    if (!r.clientSecret) {
      setError(r.error ?? "Le paiement ne répond pas. Réessaie dans un instant.");
      throw new Error(r.error ?? "checkout");
    }
    return r.clientSecret;
  }, [tier, interval]);

  if (error) return <p role="alert" className="text-[14px]" style={{ color: "var(--dk-red)" }}>{error}</p>;
  return (
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
