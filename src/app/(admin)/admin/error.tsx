"use client";

import ErrorView from "@/components/ErrorView";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView error={error} retry={retry} home="/admin" homeLabel="Retour à l'admin" />;
}
