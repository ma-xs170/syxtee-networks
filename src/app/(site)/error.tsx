"use client";

import ErrorView from "@/components/ErrorView";

// Erreur dans une page publique : la barre de navigation et le pied de page restent affichés.
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView error={error} retry={retry} />;
}
