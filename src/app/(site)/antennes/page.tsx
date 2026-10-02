import type { Metadata } from "next";
import AntennaMap from "@/components/antennes/AntennaMap";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Carte des antennes 4G/5G",
  description:
    "Carte des antennes mobiles 2G, 3G, 4G et 5G par opérateur en Guadeloupe, Martinique, Guyane, La Réunion, Mayotte, Saint-Barthélemy, Saint-Martin et en métropole, avec les pannes et maintenances du jour.",
  alternates: { canonical: "/antennes" },
};

// Carte publique des antennes (données Arcep, mises à jour chaque jour par /api/cron/antennes).
export default function AntennesPage() {
  return (
    <section className="py-14 sm:py-20">
      <Container>
        <h1 className="max-w-3xl h-section">
          Où capter en 4G et 5G.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Chaque antenne mobile par opérateur, avec ses technologies. En métropole, les pannes et maintenances du jour sont signalées.
          Pratique pour choisir tes cartes SIM avant un live IRL.
        </p>
        <div className="mt-10">
          <AntennaMap />
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted">
          Sources : ANFR, Arcep (Mon réseau mobile, Sites indisponibles) · Licence Ouverte. Sites mis à jour chaque trimestre, statuts chaque
          jour. Fond de carte : OpenFreeMap, © OpenMapTiles, données © contributeurs OpenStreetMap.
        </p>
      </Container>
    </section>
  );
}
