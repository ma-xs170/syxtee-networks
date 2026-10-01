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

// Carte communautaire : agrégats anonymes des mesures 4G/5G SYXTEE (jamais le Wi-Fi), publiés dès 1 contributeur et 5 mesures,
// avec un indice de fiabilité (Estimation, Fiable, Très fiable). Compteurs recalculés toutes les 10 min.
export default async function CouverturePage() {
  const s = await coverageStats();
  const figures = [
    [nf.format(s.contributors), s.contributors > 1 ? "contributeurs" : "contributeur"],
    [`${nf.format(s.km2)} km²`, "scannés"],
    [nf.format(s.measurements), "mesures"],
  ];
  return (
    <section className="py-14 sm:py-20">
      <Container>
        <h1 className="max-w-3xl h-section">
          La carte du réseau, <Highlight>faite par les streamers.</Highlight>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Débit montant, latence et meilleur opérateur, zone par zone, partout où un streamer est passé. Mesuré en 4G/5G pendant les lives et avec le
          Scanner réseau, de façon anonyme. Le Wi-Fi ne compte jamais.
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
          , puis lance le 
          <Link href="/dashboard/scanner" className="text-foreground underline underline-offset-4">Scanner réseau</Link>. La liste complète des antennes est sur{" "}
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
