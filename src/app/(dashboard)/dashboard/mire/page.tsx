import type { Metadata } from "next";
import Link from "next/link";
import { DashIllustration } from "@/components/dashboard/DashArt";
import MireStatus from "@/components/dashboard/MireStatus";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import RelayPicker from "@/components/relais/RelayPicker";
import { requireUser } from "@/lib/auth/dal";
import { defaultRelay } from "@/lib/relay-groups";
import { loadRelays } from "@/lib/relays";

export const metadata: Metadata = { title: "Mire de coupure", robots: { index: false } };

export default async function MirePage({ searchParams }: PageProps<"/dashboard/mire">) {
  const user = await requireUser("/dashboard/mire");
  const { relay: wanted } = await searchParams;
  const { relays } = await loadRelays(user.id);
  const active = relays.filter((r) => !r.archived);
  const current = active.find((r) => r.id === wanted) ?? defaultRelay(active);

  return (
    <DashPage>
      <DashHeader lead="Mire de" hl="coupure" sub="L'écran que voient tes viewers quand ton téléphone perd le réseau, au lieu d'un écran noir." />
      <RelayPicker relays={active} current={current?.id ?? null} base="/dashboard/mire" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Tile className="lg:col-span-2">
          <TileLabel>Mire de coupure{current && active.length > 1 ? ` · ${current.name}` : ""}</TileLabel>
          <div className="mt-4">
            {current ? (
              <MireStatus available={current.regie_available} />
            ) : (
              <p className="text-sm text-muted">
                Crée d&apos;abord un relais dans{" "}
                <Link href="/dashboard/relais" className="text-foreground underline underline-offset-4">
                  Mes relais
                </Link>
                .
              </p>
            )}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            La mire est incluse dans tous tes relais, sans réglage. OBS doit lire l&apos;URL OBS de la fiche du relais : c&apos;est elle qui passe par la mire. La mire affiche ton pseudo, le relais et l&apos;heure.
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
