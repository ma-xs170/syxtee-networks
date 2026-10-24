import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BitrateChart } from "@/components/dashboard/charts";
import { Container } from "@/components/ui";
import { fmtDuration, fmtInt, fmtKbps } from "@/lib/dashboard-data";
import { getSharedLive } from "@/lib/shared-live";

// Rapport public d'un direct (lien créé par son auteur). Jamais indexé.

export const dynamic = "force-dynamic";

const day = (iso: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date(iso));

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const live = await getSharedLive((await params).token);
  return {
    title: live ? `Direct du ${day(live.started_at)}` : "Direct introuvable",
    description: live ? `${fmtDuration(live.duration_s)} de direct, ${fmtKbps(live.avg_kbps)} en moyenne, ${live.reconnects} coupure${live.reconnects > 1 ? "s" : ""}.` : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function SharedLivePage({ params }: { params: Promise<{ token: string }> }) {
  const live = await getSharedLive((await params).token);
  if (!live) notFound();
  const facts: [string, string][] = [
    ["Durée", fmtDuration(live.duration_s)],
    ["Débit moyen", fmtKbps(live.avg_kbps)],
    ["Crête", fmtKbps(live.peak_kbps)],
    ["Coupures", fmtInt(live.reconnects)],
  ];
  return (
    <main className="pb-24 pt-16 sm:pt-24">
      <Container>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Rapport de direct · SYXTEE NETWORKS</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Direct du {day(live.started_at)}</h1>

        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-line bg-surface p-6 lg:col-span-2">
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Débit reçu par le relais</h2>
            <div className="mt-6">
              <BitrateChart points={live.bitrate_series} durationS={live.duration_s} startedAt={live.started_at} />
            </div>
          </section>
          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Stabilité</h2>
            {live.stability ? (
              <p className="mt-4">
                <span className="font-mono text-6xl font-semibold tabular-nums">{live.stability.score}</span>
                <span className="ml-2 font-mono text-lg text-muted">/ 100</span>
                <span className="mt-2 block text-lg font-medium">{live.stability.label}</span>
              </p>
            ) : (
              <p className="mt-4 text-sm text-muted">Direct trop court pour être noté.</p>
            )}
            <dl className="mt-6 space-y-3 border-t border-line pt-5">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-muted">{k}</dt>
                  <dd className="text-right font-mono text-sm tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <p className="mt-10 max-w-[60ch] text-sm leading-relaxed text-muted">
          Mesuré par le relais SYXTEE, qui rassemble les connexions 4G, 5G et Wi-Fi du téléphone en un seul flux stable.{" "}
          <Link href="/fonctionnement" className="text-foreground underline underline-offset-4">Voir comment ça marche</Link>
        </p>
      </Container>
    </main>
  );
}
