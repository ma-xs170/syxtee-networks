import type { Metadata } from "next";
import DocsIndex from "@/components/docs/DocsIndex";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Documentation",
  description: "La documentation SYXTEE NETWORKS : créer un relais, plugin OBS, contrôle à distance, sauvegardes de scènes, membres, formules et support.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return (
    <section className="border-b border-line py-20 text-center sm:py-24">
      <Container>
        <h1 className="h-serif mx-auto max-w-3xl text-[clamp(2.75rem,7vw,4.75rem)]">La <em>documentation.</em></h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">Toutes les fonctions du site, expliquées simplement.</p>
        <DocsIndex />
      </Container>
    </section>
  );
}
