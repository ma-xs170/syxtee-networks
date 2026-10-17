"use client";

import { useEffect } from "react";
import StatusPage from "@/components/StatusPage";
import { Button, ButtonLink } from "@/components/ui/Button";

// Écran d'erreur commun à tous les error.tsx : message clair, bouton Réessayer, code à nous donner.
// L'erreur est aussi envoyée au journal admin (/api/log-error) : on le sait avant que le visiteur n'écrive.
export default function ErrorView({ error, retry, home = "/", homeLabel = "Retour à l'accueil" }: { error: Error & { digest?: string }; retry: () => void; home?: string; homeLabel?: string }) {
  useEffect(() => {
    console.error(error);
    try {
      void fetch("/api/log-error", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: error.message, digest: error.digest, path: window.location.pathname }),
      });
    } catch {}
  }, [error]);

  return (
    <main id="contenu" className="flex flex-1 flex-col">
      <StatusPage
        code={error.digest ? `Erreur · ${error.digest}` : "Erreur"}
        title="Quelque chose a coupé."
        actions={
          <>
            <Button onClick={() => retry()}>Réessayer</Button>
            <ButtonLink href={home} variant="ghost">{homeLabel}</ButtonLink>
          </>
        }
      >
        La page n&apos;a pas pu se charger. Réessaie. Si le problème reste, écris-nous avec le code affiché.
      </StatusPage>
    </main>
  );
}
