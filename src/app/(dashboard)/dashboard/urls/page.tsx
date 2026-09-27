import type { Metadata } from "next";
import KeyPanel, { CreateKeys } from "@/components/dashboard/KeyPanel";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { getStreamKeys, hasCore, type StreamKeys } from "@/lib/core";

export const metadata: Metadata = { title: "Mes URLs", robots: { index: false } };

export default async function UrlsPage() {
  const user = await requireUser("/dashboard/urls");
  let keys: StreamKeys | null = null;
  let coreDown = false;
  if (hasCore) {
    try {
      keys = await getStreamKeys(user.id);
    } catch (e) {
      console.error("dashboard/urls : Core", e);
      coreDown = true;
    }
  }

  return (
    <DashPage>
      <DashHeader lead="Tes" hl="URLs" sub="À coller une fois dans Moblin et OBS. Clés masquées par défaut : clique sur l'œil pour les afficher." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Tile className="lg:col-span-2">
          {!hasCore || coreDown ? (
            <p className="text-sm text-muted">
              {coreDown ? "Le relais ne répond pas pour le moment. Réessaie dans quelques minutes." : "Le relais n'est pas encore branché au dashboard. Tes URLs arrivent ici très bientôt."}
            </p>
          ) : keys ? (
            <KeyPanel key={keys.moblin_srtla_url} keys={keys} />
          ) : (
            <CreateKeys />
          )}
        </Tile>
        <div className="space-y-4">
          <Tile>
            <TileLabel>Une clé a fuité ?</TileLabel>
            <p className="mt-3 text-sm leading-relaxed text-muted">Quiconque connaît ton URL Moblin peut diffuser à ta place. Régénère ta clé : l&apos;ancienne cesse de marcher tout de suite.</p>
            <div className="mt-4">
              <ArrowLink href="/dashboard/securite">Sécurité & clés</ArrowLink>
            </div>
          </Tile>
          <Tile>
            <TileLabel>Besoin d&apos;aide ?</TileLabel>
            <p className="mt-3 text-sm leading-relaxed text-muted">Réglages Moblin conseillés, source OBS, débit : tout est dans les guides.</p>
            <div className="mt-4">
              <ArrowLink href="/docs">Documentation</ArrowLink>
            </div>
          </Tile>
        </div>
      </div>
    </DashPage>
  );
}
