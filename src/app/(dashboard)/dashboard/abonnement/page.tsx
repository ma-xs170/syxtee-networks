import type { Metadata } from "next";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Abonnement", robots: { index: false } };

const included = ["Relais SRTLA et SRT", "1 flux simultané", "Santé du flux et aperçu", "Historique des directs", "Support Discord"];

export default async function AbonnementPage() {
  await requireUser("/dashboard/abonnement");
  return (
    <DashPage>
      <DashHeader lead="Ta" hl="formule" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Tile className="lg:col-span-2">
          <TileLabel>Formule actuelle</TileLabel>
          <p className="mt-4 text-3xl font-semibold tracking-tight">Bêta gratuite</p>
          <p className="mt-2 max-w-[60ch] text-sm text-muted">Pendant la bêta, le relais est gratuit. Les offres payantes seront annoncées sur le Discord avant leur ouverture.</p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {included.map((i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span aria-hidden="true" className="text-muted">
                  +
                </span>
                {i}
              </li>
            ))}
          </ul>
        </Tile>
        <Tile>
          <TileLabel>Après la bêta</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">Plusieurs flux, relais dédiés et régie : les formules arrivent bientôt.</p>
          <div className="mt-5">
            <ArrowLink href="/offres">Voir les offres</ArrowLink>
          </div>
        </Tile>
      </div>
    </DashPage>
  );
}
