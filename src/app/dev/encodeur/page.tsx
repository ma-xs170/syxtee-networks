import { notFound } from "next/navigation";
import EncoderApp from "@/components/encoder/EncoderApp";

// Aperçu de développement du dashboard de l'Encodeur, sans connexion (pour les captures). Absent en production.
export default async function DevEncoderPage({ searchParams }: { searchParams: Promise<{ locked?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locked } = await searchParams;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-medium tracking-[-0.03em]">Encodeur</h1>
      <EncoderApp locked={locked === "1"} />
    </main>
  );
}
