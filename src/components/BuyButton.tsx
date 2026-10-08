"use client";

import { useState, useTransition } from "react";
import { startProductCheckout } from "@/app/(site)/boutique/actions";
import { Button } from "./ui/Button";

/** Bouton d'achat : ouvre le paiement sécurisé ; affiche la raison en cas de refus (paiement pas encore ouvert, connexion requise). */
export default function BuyButton({ productId, children, variant = "primary", className = "" }: { productId: string; children: React.ReactNode; variant?: "primary" | "secondary"; className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className={className}>
      <Button
        variant={variant}
        loading={pending}
        className="w-full"
        onClick={() =>
          start(async () => {
            setError("");
            const r = await startProductCheckout(productId);
            if (r?.error) setError(r.error);
          })
        }
      >
        {children}
      </Button>
      {error && <p role="alert" className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
