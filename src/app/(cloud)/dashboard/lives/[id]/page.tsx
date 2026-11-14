import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BitrateChart } from "@/components/dashboard/charts";
import ShareReport from "@/components/dashboard/ShareReport";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { getProfile } from "@/lib/auth/dal";
import { stability } from "@/lib/live-report";
import { dataClient, requireOwner } from "@/lib/workspace";
import { accountTimezone } from "@/lib/regions";
import { deviceLabel, fmtDate, fmtDuration, fmtInt, fmtKbps } from "@/lib/dashboard-data";
import { getSession } from "@/lib/dashboard-overview";
import PlanGate from "@/components/plans/PlanGate";

export const metadata: Metadata = { title: "Direct", robots: { index: false } };

export default async function LivePage({ params }: PageProps<"/dashboard/lives/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [, profile, s] = await Promise.all([requireOwner(`/dashboard/lives/${id}`), getProfile(), getSession(id)]);
  const timezone = accountTimezone(profile);
  if (!s) notFound();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  // Lu à part : la colonne vient de la migration 0064, et son absence ne doit jamais casser la page.
  const { db } = await dataClient();
  const shared = await db.from("live_sessions").select("share_token").eq("id", id).maybeSingle();
  const token = (shared.data as { share_token: string | null } | null)?.share_token ?? null;
  const stable = stability(s);

  const facts: [string, string][] = [
    ["Appareil", deviceLabel(s)],
    ["Durée", s.ended_at ? fmtDuration(s.duration_s) : `${fmtDuration(s.duration_s)}, en cours`],
    ["Débit moyen", fmtKbps(s.avg_kbps)],
    ["Crête", fmtKbps(s.peak_kbps)],
    ["Coupures", fmtInt(s.reconnects)],
    ["Relais", s.relay],
    ...(stable ? ([["Stabilité", `${stable.score} / 100 · ${stable.label}`]] as [string, string][]) : []),
  ];

  return (
    <DashPage>
      <PlanGate feature="lives">
      <div className="mb-6">
        <ArrowLink href="/dashboard/lives">Historique des directs</ArrowLink>
      </div>
      <DashHeader lead="Direct du" hl={fmtDate(s.started_at, timezone)} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
        {s.ended_at && (
          <Tile className="lg:col-span-3">
            <TileLabel>Partager le rapport</TileLabel>
            <div className="mt-4 max-w-2xl">
              <ShareReport id={s.id} initialToken={token} origin={origin} />
            </div>
          </Tile>
        )}
      </div>
    </PlanGate>
    </DashPage>
  );
}
