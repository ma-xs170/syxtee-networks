import type { Metadata } from "next";
import Link from "next/link";
import CoverageMap from "@/components/couverture/CoverageMap";
import { Container } from "@/components/ui";
import Highlight from "@/components/ui/Highlight";
import { coverageStats } from "@/lib/coverage/public";

export const metadata: Metadata = {
  title: "Où capter en 4G et 5G",
  description: "La carte du réseau mobile mesurée par les streamers IRL : débit, latence et meilleur opérateur, zone par zone.",
  alternates: { canonical: "/couverture" },
};

export const revalidate = 600;

const nf = new Intl.NumberFormat("fr-FR");

// Carte communautaire : agrégats anonymes des mesures SYXTEE (Prompt A), publiés dès 3 contributeurs ou 20 mesures.
export default async function CouverturePage() {
  const s = await coverageStats();
  const figures = [
    [`${nf.format(s.km2)} km²`, "scannés"],
    [nf.format(s.measurements), "mesures"],
    [nf.format(s.contributors), "contributeurs"],
  ];
  return (
    <section className="py-14 sm:py-20">
      <Container>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
          La carte du réseau, <Highlight>faite par les streamers.</Highlight>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Débit montant, latence et meilleur opérateur, zone par zone. Mesuré pendant les lives et les scans SYXTEE Cam, de façon anonyme.
        </p>
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
          {figures.map(([v, l]) => (
            <div key={l}>
              <dt className="sr-only">{l}</dt>
              <dd className="font-mono text-2xl tabular-nums">
                {v} <span className="text-sm text-muted">{l}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-10">
          <CoverageMap />
        </div>
        <p className="mt-6 text-sm text-muted">
          Tu veux faire avancer la carte ? Active le partage dans ton{" "}
          <Link href="/dashboard/parametres#couverture" className="text-foreground underline underline-offset-4">
            dashboard
          </Link>
          , puis lance le mode Scan de SYXTEE Cam. La liste complète des antennes est sur{" "}
          <Link href="/antennes" className="text-foreground underline underline-offset-4">
            la carte des antennes
          </Link>
          .
        </p>
        <p className="mt-6 text-xs leading-relaxed text-muted">
          Sources : mesures communautaires SYXTEE, ANFR, Arcep (Licence Ouverte). Données opérateur : IPinfo (CC BY-SA 4.0). Fond de carte :
          OpenFreeMap, © OpenMapTiles, données © contributeurs OpenStreetMap.
        </p>
      </Container>
    </section>
  );
}
