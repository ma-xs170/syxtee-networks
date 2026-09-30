import type { Metadata } from "next";
import Link from "next/link";
import { DailyBars } from "@/components/dashboard/charts";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel, SectionTabs } from "@/components/dashboard/ui";
import { statsTabs } from "@/lib/dashboard-nav";
import { requireUser } from "@/lib/auth/dal";
import { delta, fmtDuration, fmtInt, isRange } from "@/lib/dashboard-data";
import { getStats } from "@/lib/dashboard-overview";
import PlanGate from "@/components/plans/PlanGate";

export const metadata: Metadata = { title: "Statistiques", robots: { index: false } };

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-black p-4 sm:p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1.5 font-mono text-2xl tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-1 font-mono text-xs text-muted">{sub}</p>}
    </div>
  );
}

export default async function StatsPage({ searchParams }: PageProps<"/dashboard/stats">) {
  await requireUser("/dashboard/stats");
  const { range: r } = await searchParams;
  const range = isRange(r) ? r : "7d";
  const { days, any, kpis: k, previous: p, longest, reconnects, short, daily } = await getStats(range);
  const cmp = (a: number, b: number) => delta(a, b)?.text ?? "rien avant";

  return (
    <DashPage>
      <SectionTabs tabs={statsTabs} current="/dashboard/stats" label="Statistiques" />
      <PlanGate feature="stats">
      <DashHeader lead="Tes" hl="statistiques" sub={`Tes directs sur les ${days} derniers jours, comparés aux ${days} jours d'avant.`}>
        <div role="radiogroup" aria-label="Période" className="inline-flex rounded-full border border-line p-0.5">
          {(["7d", "30d"] as const).map((x) => (
            <Link
              key={x}
              href={`/dashboard/stats?range=${x}`}
              role="radio"
              aria-checked={range === x}
              className={`flex h-8 items-center rounded-full px-4 font-mono text-xs transition-colors ${range === x ? "bg-white text-black" : "text-muted hover:text-foreground"}`}
            >
              {x === "7d" ? "7 jours" : "30 jours"}
            </Link>
          ))}
        </div>
      </DashHeader>

      {!any ? (
        <Tile>
          <p className="text-sm text-muted">Pas encore de direct enregistré. Tes chiffres apparaissent ici après ton premier live.</p>
          <div className="mt-4">
            <ArrowLink href="/dashboard/relais">Mes relais</ArrowLink>
          </div>
        </Tile>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
            <Figure label="Temps de direct" value={fmtDuration(k.seconds)} sub={cmp(k.seconds, p.seconds)} />
            <Figure label="Nombre de directs" value={fmtInt(k.count)} sub={cmp(k.count, p.count)} />
            <Figure label="Durée moyenne" value={k.count ? fmtDuration(k.avgSeconds) : "–"} sub={cmp(k.avgSeconds, p.avgSeconds)} />
            <Figure label="Débit moyen" value={k.avgKbps ? fmtInt(k.avgKbps) : "–"} sub={k.peakKbps ? `kbit/s, crête à ${fmtInt(k.peakKbps)}` : "kbit/s"} />
            <Figure label="Plus long direct" value={longest ? fmtDuration(longest.duration_s) : "–"} />
            <Figure label="Coupures" value={fmtInt(reconnects)} sub="reconnexions en direct" />
            <Figure label="Directs de moins d'une minute" value={fmtInt(short)} />
            <Figure label="Période précédente" value={fmtDuration(p.seconds)} sub={`${fmtInt(p.count)} directs`} />
          </div>
          <Tile>
            <TileLabel>Temps de direct par jour</TileLabel>
            <div className="mt-6">
              <DailyBars days={daily} />
            </div>
          </Tile>
          <div className="flex justify-end">
            <ArrowLink href="/dashboard/lives">Historique des lives</ArrowLink>
          </div>
        </div>
      )}
    </PlanGate>
    </DashPage>
  );
}
