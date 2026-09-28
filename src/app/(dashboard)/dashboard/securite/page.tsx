import type { Metadata } from "next";
import StreamModeToggle from "@/components/dashboard/StreamModeToggle";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Sécurité & clés", robots: { index: false } };

export default async function SecuritePage() {
  await requireUser("/dashboard/securite");

  return (
    <DashPage>
      <DashHeader lead="Sécurité &" hl="clés" sub="Tes clés de stream sont dans tes URLs : quiconque les connaît peut diffuser à ta place." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Tile>
          <TileLabel>Tes clés</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Chaque relais a sa propre clé. Régénère-la si tu l&apos;as montrée en live ou partagée : les anciennes URLs de ce relais cessent de marcher immédiatement.
          </p>
          <div className="mt-6">
            <ArrowLink href="/dashboard/relais">Mes relais</ArrowLink>
          </div>
        </Tile>
        <Tile>
          <TileLabel>Mode stream</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Tu montres ton dashboard en live ? Active le mode stream : clés, URLs et e-mail sont floutés partout, et le bouton œil est bloqué.
          </p>
          <div className="mt-6">
            <StreamModeToggle withLabel />
          </div>
        </Tile>
      </div>
    </DashPage>
  );
}
