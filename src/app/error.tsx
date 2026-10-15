"use client";

import { useEffect } from "react";
import StatusPage from "@/components/StatusPage";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="contenu" className="flex flex-1 flex-col">
      <StatusPage
        code={error.digest ? `Erreur · ${error.digest}` : "Erreur"}
        title="Quelque chose a coupé."
        actions={
          <>
            <Button onClick={() => retry()}>Réessayer</Button>
            <ButtonLink href="/" variant="ghost">Retour à l&apos;accueil</ButtonLink>
          </>
        }
      >
        La page n&apos;a pas pu se charger. Réessaie. Si le problème reste, écris-nous avec le code affiché.
      </StatusPage>
    </main>
  );
}
