import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashPage } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import RelayActions from "@/components/relais/RelayActions";
import RelayAnalysis from "@/components/relais/RelayAnalysis";
import RelayUrls from "@/components/relais/RelayUrls";
import ProtocolBadge from "@/components/relais/ProtocolBadge";
import { publicCoreUrl } from "@/lib/core";
import { fmtAgo, fmtDuration, fmtInt } from "@/lib/dashboard-data";
import { distanceKm, estimateRtt, flag, latencyTone, serverById } from "@/lib/relay-servers";
import { loadRelays } from "@/lib/relays";
import { dataClient, requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Serveur", robots: { index: false } };

const TONE = { good: "text-ok", fair: "text-warn", bad: "text-bad", none: "text-muted" } as const;

type Session = { id: string; started_at: string; duration_s: number; avg_kbps: number; peak_kbps: number; reconnects: number; ended_at: string | null };

export default async function RelayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOwner(`/dashboard/relais/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { relays, status } = await loadRelays(user.id);
  const relay = relays.find((r) => r.id === id);
  if (status === "ok" && !relay) notFound();
  if (!relay) {
    return (
      <DashPage>
        <Link href="/dashboard/relais" className="text-sm text-muted transition-colors hover:text-foreground">← Serveurs</Link>
        <p className="mt-6 text-sm text-muted">Le serveur ne répond pas pour le moment. Réessaie dans quelques minutes.</p>
      </DashPage>
    );
  }

  // Historique des directs de ce serveur sur 30 jours.
  const { db, ownerId } = await dataClient();
  let q = db.from("live_sessions").select("id, started_at, ended_at, duration_s, avg_kbps, peak_kbps, reconnects").eq("relay_id", relay.id).gte("started_at", new Date(Date.now() - 30 * 86_400_000).toISOString()).order("started_at", { ascending: false }).limit(200);
  if (ownerId) q = q.eq("user_id", ownerId);
  const sessions = (((await q).data ?? []) as Session[]);
  const done = sessions.filter((s) => s.ended_at);
  const totalS = done.reduce((a, s) => a + s.duration_s, 0);
  const avg = totalS ? Math.round(done.reduce((a, s) => a + s.avg_kbps * s.duration_s, 0) / totalS) : 0;
  const peak = sessions.reduce((a, s) => Math.max(a, s.peak_kbps), 0);
  const cuts = sessions.reduce((a, s) => a + s.reconnects, 0);

  // Serveur utilisé et latence estimée depuis la position du visiteur.
  const server = serverById(relay.server);
  const h = await headers();
  const lat = Number(h.get("x-vercel-ip-latitude"));
  const lon = Number(h.get("x-vercel-ip-longitude"));
  const here = h.get("x-vercel-ip-latitude") && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  const estimate = server && here ? estimateRtt(distanceKm(here, server)) : null;
  const tone = latencyTone(estimate);

  const proto = relay.protocol.toUpperCase();
  const services: { name: string; text: string; ok: boolean | null }[] = [
    { name: "Serveur de réception", text: server?.maintenance ? "En maintenance" : server?.available ? "Opérationnel" : "Bientôt disponible", ok: server ? server.available && !server.maintenance : null },
    { name: `Entrée ${proto}`, text: relay.archived ? "Archivée : adresses désactivées" : "Active", ok: !relay.archived },
    { name: "Diffusion vers OBS", text: relay.archived ? "Indisponible" : relay.live ? "En cours" : "Prête", ok: !relay.archived },
    { name: "Enregistrement du flux", text: !relay.record_available ? "Indisponible sur ce serveur" : relay.record ? "Activé" : "Disponible, désactivé", ok: relay.record_available ? true : null },
    { name: "Régie automatique", text: relay.regie_available ? (relay.mode === "regie" ? "Activée" : "Disponible") : "Indisponible", ok: relay.regie_available ? true : null },
  ];

  const stateText = relay.archived ? "Archivé" : relay.live ? "En direct" : relay.last_live_at ? `Dernier direct ${fmtAgo(relay.last_live_at)}` : "Jamais utilisé";

  return (
    <DashPage>
      <PlanGate feature="relais">
        <Link href="/dashboard/relais" className="text-sm text-muted transition-colors hover:text-foreground">← Serveurs</Link>

        <header className="mb-8 mt-4 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className="h-page break-words">{relay.name}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {relay.live ? <span className="inline-flex items-center gap-2 text-live"><span className="live-dot" />En direct</span> : <span>{stateText}</span>}
              <ProtocolBadge protocol={relay.protocol} />
              {server && <span>{flag(server.cc)} {server.city}, {server.country}</span>}
              <span>Créé {fmtAgo(relay.created_at)}</span>
            </p>
          </div>
          <RelayActions relay={relay} showView={false} />
        </header>

        {relay.archived ? (
          <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">Ce serveur est archivé : ses adresses ne marchent plus. Réactive-le depuis le menu « Plus » pour diffuser de nouveau.</p>
        ) : (
          <div className="space-y-10">
            <RelayAnalysis coreUrl={publicCoreUrl} relayId={relay.id} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section aria-labelledby="stats30" className="rounded-2xl border border-line bg-surface">
                <h2 id="stats30" className="border-b border-line px-5 py-3.5 text-sm font-semibold">Statistiques sur 30 jours</h2>
                <dl className="grid grid-cols-2 divide-line sm:grid-cols-3 [&>div]:border-b [&>div]:border-line">
                  {([["Directs", fmtInt(sessions.length)], ["Temps de direct", totalS ? fmtDuration(totalS) : "-"], ["Débit moyen", avg ? `${fmtInt(avg)} kbit/s` : "-"], ["Débit de crête", peak ? `${fmtInt(peak)} kbit/s` : "-"], ["Coupures", fmtInt(cuts)], ["Dernier direct", relay.last_live_at ? fmtAgo(relay.last_live_at) : "-"]] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="p-5">
                      <dt className="text-xs text-muted">{k}</dt>
                      <dd className="mt-2 font-mono text-lg tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                {sessions.length > 0 && (
                  <ul className="divide-y divide-line">
                    {sessions.slice(0, 4).map((s) => (
                      <li key={s.id}>
                        <Link href={`/dashboard/lives/${s.id}`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm transition-colors hover:bg-foreground/[0.04]">
                          <span className="text-muted">{fmtAgo(s.started_at)}</span>
                          <span className="font-mono tabular-nums">{s.ended_at ? fmtDuration(s.duration_s) : "En cours"} · {fmtInt(s.avg_kbps)} kbit/s</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="space-y-4">
                <section aria-labelledby="serveur" className="rounded-2xl border border-line bg-surface">
                  <h2 id="serveur" className="border-b border-line px-5 py-3.5 text-sm font-semibold">Serveur utilisé</h2>
                  <dl className="divide-y divide-line px-5 text-sm">
                    {([["Emplacement", server ? `${flag(server.cc)} ${server.city}, ${server.country}` : relay.server], ["Identifiant", relay.server], ["Adresse", relay.host], ["Protocole", proto]] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="text-muted">{k}</dt>
                        <dd className="min-w-0 truncate text-right font-medium" data-sensitive={k === "Adresse" ? true : undefined}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section aria-labelledby="latence" className="rounded-2xl border border-line bg-surface">
                  <h2 id="latence" className="border-b border-line px-5 py-3.5 text-sm font-semibold">Latence</h2>
                  <div className="grid grid-cols-2 divide-x divide-line">
                    <div className="p-5">
                      <p className="text-xs text-muted">Estimée depuis chez toi</p>
                      <p className={`mt-2 font-mono text-2xl tabular-nums ${TONE[tone]}`}>{estimate != null ? `~${estimate}` : "-"}<span className="ml-1 text-sm text-muted">ms</span></p>
                      <p className="mt-1 text-xs text-muted">{estimate == null ? "Position inconnue" : tone === "good" ? "Excellente" : tone === "fair" ? "Correcte" : "Élevée"}</p>
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-muted">Mesurée en direct</p>
                      <p className="mt-2 text-sm text-muted">Affichée dans l&apos;analyse ci-dessus pendant un direct.</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section aria-labelledby="dispo" className="rounded-2xl border border-line bg-surface">
                <h2 id="dispo" className="border-b border-line px-5 py-3.5 text-sm font-semibold">Disponibilité des services</h2>
                <ul className="divide-y divide-line px-5">
                  {services.map((sv) => (
                    <li key={sv.name} className="flex items-center justify-between gap-4 py-3.5 text-sm">
                      <span className="flex items-center gap-2.5">
                        <span aria-hidden="true" className={`size-2 rounded-full ${sv.ok === true ? "bg-ok" : sv.ok === false ? "bg-bad" : "bg-foreground/25"}`} />
                        {sv.name}
                      </span>
                      <span className={sv.ok === false ? "text-bad" : "text-muted"}>{sv.text}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="urls" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <h2 id="urls" className="text-sm font-semibold">Adresses de connexion</h2>
                <p className="mb-5 mt-1 text-xs text-muted">Elles contiennent la clé de ce serveur : ne les partage pas et ne les montre pas en direct.</p>
                <RelayUrls relay={relay} />
              </section>
            </div>
          </div>
        )}
      </PlanGate>
    </DashPage>
  );
}
