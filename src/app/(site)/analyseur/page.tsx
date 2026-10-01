import type { Metadata } from "next";
import AnalyzerClient from "@/components/analyseur/AnalyzerClient";
import { Container } from "@/components/ui";
import Highlight from "@/components/ui/Highlight";
import { hasCore, publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = {
  title: "Analyseur réseau 4G / 5G",
  description: "Teste ton réseau mobile là où tu es : débit montant et descendant, latence, gigue, opérateur et note de la zone sur la carte des streamers.",
  alternates: { canonical: "/analyseur" },
};

// Analyseur public : tests sans compte, rien n'est gardé (volume plafonné par IP côté Core). Même moteur que le Scanner réseau.
export default function AnalyseurPublicPage() {
  return (
    <section className="py-14 sm:py-20">
      <Container>
        <h1 className="max-w-3xl h-section">
          Ton réseau, <Highlight>mesuré ici.</Highlight>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Débit montant (celui qui compte pour streamer), latence, gigue, opérateur et note de la zone sur la carte communautaire. Coupe le Wi-Fi pour
          mesurer la 4G/5G.
        </p>
        <div className="mt-10">
          {hasCore ? (
            <AnalyzerClient coreUrl={publicCoreUrl} />
          ) : (
            <p className="text-sm text-muted">L&apos;analyseur n&apos;est pas encore branché au serveur de mesure.</p>
          )}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted">
          Un test consomme jusqu&apos;à 30 Mo de data mobile. Données opérateur : IPinfo (CC BY-SA 4.0).
        </p>
      </Container>
    </section>
  );
}
