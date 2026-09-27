import type { Metadata } from "next";
import { DashIllustration } from "@/components/dashboard/DashArt";
import ModeSwitch from "@/components/dashboard/ModeSwitch";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { getStreamKeys, hasCore, type StreamKeys } from "@/lib/core";

export const metadata: Metadata = { title: "Mire de coupure", robots: { index: false } };

export default async function MirePage() {
  const user = await requireUser("/dashboard/mire");
  let keys: StreamKeys | null = null;
  if (hasCore) keys = await getStreamKeys(user.id).catch(() => null);

  return (
    <DashPage>
      <DashHeader lead="Mire de" hl="coupure" sub="L'écran que voient tes viewers quand ton téléphone perd le réseau, au lieu d'un écran noir." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Tile className="lg:col-span-2">
          <TileLabel>Mode de sortie</TileLabel>
          <div className="mt-4">
            {keys ? (
              <ModeSwitch mode={keys.mode} available={keys.regie_available} />
            ) : (
              <p className="text-sm text-muted">Génère d&apos;abord tes clés dans Mes URLs.</p>
            )}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            En mode Régie, le relais réencode ton flux : ton URL OBS change, recopie-la depuis Mes URLs après la bascule. La mire affiche ton pseudo, le relais et l&apos;heure.
          </p>
        </Tile>
        <Tile as="div" className="flex items-center justify-center">
          <div className="h-52 w-full max-w-[280px]">
            <DashIllustration icon="mire" />
          </div>
        </Tile>
      </div>
    </DashPage>
  );
}
