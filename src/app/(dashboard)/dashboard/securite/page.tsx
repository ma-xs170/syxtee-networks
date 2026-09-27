import type { Metadata } from "next";
import { RotateKey } from "@/components/dashboard/KeyPanel";
import StreamModeToggle from "@/components/dashboard/StreamModeToggle";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { getStreamKeys, hasCore, type StreamKeys } from "@/lib/core";
import { fmtAgo } from "@/lib/dashboard-data";

export const metadata: Metadata = { title: "Sécurité & clés", robots: { index: false } };

export default async function SecuritePage() {
  const user = await requireUser("/dashboard/securite");
  let keys: StreamKeys | null = null;
  if (hasCore) keys = await getStreamKeys(user.id).catch(() => null);

  return (
    <DashPage>
      <DashHeader lead="Sécurité &" hl="clés" sub="Ta clé de stream est dans tes URLs : quiconque la connaît peut diffuser à ta place." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Tile>
          <TileLabel>Ta clé</TileLabel>
          {keys ? (
            <>
              <p className="mt-4 text-sm text-muted">
                Créée {fmtAgo(keys.created_at)}
                {keys.rotated_at && `, régénérée ${fmtAgo(keys.rotated_at)}`}.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">Régénère-la si tu l&apos;as montrée en live ou partagée. Les anciennes URLs cessent de marcher immédiatement.</p>
              <div className="mt-6">
                <RotateKey />
              </div>
            </>
          ) : (
            <div className="mt-4">
              <ArrowLink href="/dashboard/urls">Générer mes clés</ArrowLink>
            </div>
          )}
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
