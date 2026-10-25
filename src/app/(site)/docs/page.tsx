import { site } from "@/lib/site";
import type { Metadata } from "next";
import DocsIndex from "@/components/docs/DocsIndex";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Documentation",
  description: "La documentation SYXTEE NETWORKS : créer un relais, plugin OBS, contrôle à distance, sauvegardes de scènes, membres, formules et support.",
  alternates: { canonical: `${site.docsUrl}/docs` },
};

export default function DocsPage() {
  return (
    <section className="pb-24 pt-[calc(5rem+65px)] text-center sm:pb-32 lg:pt-[calc(7rem+65px)]">
      <Container>
        <h1 className="h-serif mx-auto max-w-3xl text-[clamp(2.75rem,7vw,4.75rem)]">La <em>documentation.</em></h1>
        <p className="mx-auto mt-6 max-w-[40ch] text-lg leading-relaxed text-muted">Toutes les fonctions du site, expliquées simplement.</p>
        <DocsIndex />
      </Container>
    </section>
  );
}
