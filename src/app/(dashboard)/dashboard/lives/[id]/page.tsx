import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BitrateChart } from "@/components/dashboard/charts";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { accountTimezone } from "@/lib/regions";
import { deviceLabel, fmtDate, fmtDuration, fmtInt, fmtKbps } from "@/lib/dashboard-data";
import { getSession } from "@/lib/dashboard-overview";
import PlanGate from "@/components/plans/PlanGate";

export const metadata: Metadata = { title: "Direct", robots: { index: false } };

export default async function LivePage({ params }: PageProps<"/dashboard/lives/[id]">) {
  const { id } = await params;
  await requireUser(`/dashboard/lives/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const timezone = accountTimezone(await getProfile());
  const s = await getSession(id);
  if (!s) notFound();

  const facts: [string, string][] = [
    ["Appareil", deviceLabel(s)],
    ["Durée", s.ended_at ? fmtDuration(s.duration_s) : `${fmtDuration(s.duration_s)}, en cours`],
    ["Débit moyen", fmtKbps(s.avg_kbps)],
    ["Crête", fmtKbps(s.peak_kbps)],
    ["Coupures", fmtInt(s.reconnects)],
    ["Relais", s.relay],
  ];

  return (
    <DashPage>
      <PlanGate feature="lives">
      <div className="mb-6">
        <ArrowLink href="/dashboard/lives">Historique des lives</ArrowLink>
      </div>
      <DashHeader lead="Direct du" hl={fmtDate(s.started_at, timezone)} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Tile className="lg:col-span-2">
          <TileLabel>Débit reçu au relais</TileLabel>
          <div className="mt-6">
            <BitrateChart points={s.bitrate_series} durationS={s.duration_s} startedAt={s.started_at} />
          </div>
        </Tile>
        <Tile>
          <TileLabel>En bref</TileLabel>
          <dl className="mt-4 space-y-3">
            {facts.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="text-right font-mono text-sm tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          {s.duration_s < 60 && s.ended_at && (
            <p className="mt-6 border-t border-line pt-4 text-sm text-muted">Moins d&apos;une minute : la connexion a peut-être coupé au démarrage. Vérifie tes liens dans Moblin.</p>
          )}
        </Tile>
      </div>
    </PlanGate>
    </DashPage>
  );
}
