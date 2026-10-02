import type { Metadata } from "next";
import { statsTabs } from "@/lib/dashboard-nav";
import Link from "next/link";
import MyCoverageMap, { type MyCell } from "@/components/dashboard/MyCoverageMap";
import { DashHeader, DashPage, Tile, TileLabel, SectionTabs } from "@/components/dashboard/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mes contributions", robots: { index: false } };

type Mine = { measurements: number; hexes: number; discovered: number; improved: number; cells: MyCell[] };
const nf = new Intl.NumberFormat("fr-FR");

// Outils → Mes contributions : ce que tes scans et tes lives (en 4G/5G, jamais en Wi-Fi) ont apporté à la carte /couverture.
// Lien compte ↔ hexagones gardé 90 jours (table contributions, RLS), lu par my_coverage().
export default async function ContributionsPage() {
  await requireUser("/dashboard/contributions");
  const profile = await getProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_coverage");
  if (error) console.error("my_coverage", error.message);
  const mine: Mine = { measurements: 0, hexes: 0, discovered: 0, improved: 0, cells: [], ...((data as Mine | null) ?? {}) };
  const contributor = mine.measurements > 0;
  const figures = [
    [nf.format(mine.measurements), "mesures 4G/5G"],
    [nf.format(mine.hexes), "zones scannées"],
    [nf.format(mine.discovered), "zones découvertes"],
  ];

  return (
    <DashPage>
      <SectionTabs tabs={statsTabs} current="/dashboard/contributions" label="Statistiques" />
      <DashHeader lead="Mes" hl="contributions" sub="Tes mesures 4G/5G sur la carte communautaire, sur les 90 derniers jours." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Tile className="lg:col-span-1">
          <TileLabel
            right={
              contributor ? (
                <span className="rounded-full border border-foreground/50 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground">Contributeur</span>
              ) : null
            }
          >
            Bilan
          </TileLabel>
          <dl className="mt-5 grid gap-4">
            {figures.map(([v, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="font-mono text-2xl tabular-nums">
                  {v} <span className="text-sm text-muted">{l}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed">
            {contributor ? (
              <>
                Tes mesures ont amélioré <span className="font-mono tabular-nums">{nf.format(mine.improved)}</span> zone{mine.improved > 1 ? "s" : ""} de la carte
                publique.
              </>
            ) : profile?.coverage_consent ? (
              <span className="text-muted">Pas encore de mesure 4G/5G. Lance le <Link href="/dashboard/scanner" className="text-foreground underline underline-offset-4">Scanner réseau</Link>, Wi-Fi coupé.</span>
            ) : (
              <span className="text-muted">
                Active le partage dans{" "}
                <Link href="/dashboard/parametres#couverture" className="text-foreground underline underline-offset-4">
                  Paramètres
                </Link>
                , puis lance le <Link href="/dashboard/scanner" className="text-foreground underline underline-offset-4">Scanner réseau</Link>.
              </span>
            )}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">Les mesures faites en Wi-Fi ne comptent pas : seule la 4G/5G fait avancer la carte.</p>
        </Tile>
        <Tile className="lg:col-span-2">
          <TileLabel right={<Link href="/couverture" className="text-xs text-muted underline underline-offset-4 hover:text-foreground">Carte publique</Link>}>
            Ma carte
          </TileLabel>
          <div className="mt-4">
            <MyCoverageMap cells={mine.cells} />
          </div>
        </Tile>
      </div>
    </DashPage>
  );
}
