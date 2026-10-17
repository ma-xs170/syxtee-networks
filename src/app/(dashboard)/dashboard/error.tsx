"use client";

import ErrorView from "@/components/ErrorView";

// Erreur dans une page du dashboard : le menu reste affiché, seul le contenu est remplacé.
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView error={error} retry={retry} home="/dashboard" homeLabel="Retour au dashboard" />;
}
