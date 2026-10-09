import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashPage } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import RelayActions from "@/components/relais/RelayActions";
import RelayAnalysis from "@/components/relais/RelayAnalysis";
import RelayUrls from "@/components/relais/RelayUrls";
import { ActionButton, Card, Fact, Item, Pill, RowMenu, Setting, TabsNav } from "@/components/dashboard/panel";
import ProtocolBadge from "@/components/relais/ProtocolBadge";
import { getRelay, publicCoreUrl } from "@/lib/core";
import { getProfile } from "@/lib/auth/dal";
import { countryCoords } from "@/lib/country-coords";
import { fmtAgo, fmtDuration, fmtInt } from "@/lib/dashboard-data";
import { distanceKm, estimateRtt, flag, latencyTone, serverById } from "@/lib/relay-servers";
import { dataClient, requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Serveur", robots: { index: false } };

const TONE = { good: "text-ok", fair: "text-warn", bad: "text-bad", none: "text-muted" } as const;

type Session = { id: string; started_at: string; duration_s: number; avg_kbps: number; peak_kbps: number; reconnects: number; ended_at: string | null };

export default async function RelayPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ onglet?: string }> }) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const user = await requireOwner(`/dashboard/relais/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // Un seul serveur demandé au Core (pas toute la liste), en parallèle de l'historique des directs et de la position du visiteur.
  const { db, ownerId } = await dataClient();
  let q = db.from("live_sessions").select("id, started_at, ended_at, duration_s, avg_kbps, peak_kbps, reconnects").eq("relay_id", id).gte("started_at", new Date(Date.now() - 30 * 86_400_000).toISOString()).order("started_at", { ascending: false }).limit(60);
  if (ownerId) q = q.eq("user_id", ownerId);
  const [relay, sessionsRes, h, profile] = await Promise.all([getRelay(user.id, id).catch(() => null), q, headers(), getProfile()]);
  if (!relay) {
    return (
      <DashPage>
        <Link href="/dashboard/relais" className="text-sm text-muted transition-colors hover:text-foreground">← Retour à la liste des serveurs</Link>
        <p className="mt-6 text-sm text-muted">Ce serveur est introuvable, ou le service ne répond pas pour le moment. Réessaie dans quelques minutes.</p>
      </DashPage>
    );
  }
  const sessions = (sessionsRes.data ?? []) as Session[];
  const done = sessions.filter((s) => s.ended_at);
  const totalS = done.reduce((a, s) => a + s.duration_s, 0);
  const avg = totalS ? Math.round(done.reduce((a, s) => a + s.avg_kbps * s.duration_s, 0) / totalS) : 0;
  const peak = sessions.reduce((a, s) => Math.max(a, s.peak_kbps), 0);
  const cuts = sessions.reduce((a, s) => a + s.reconnects, 0);

  // Serveur utilisé et latence estimée depuis la position du visiteur.
  const server = serverById(relay.server);
  // Position : le pays choisi à la création du compte ; à défaut, la position de la connexion.
  const fromAccount = countryCoords(profile?.country);
  const lat = Number(h.get("x-vercel-ip-latitude"));
  const lon = Number(h.get("x-vercel-ip-longitude"));
  const fromIp = h.get("x-vercel-ip-latitude") && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  const here = fromAccount ?? fromIp;
  const countryName = profile?.country ? (new Intl.DisplayNames(["fr"], { type: "region" }).of(profile.country) ?? profile.country) : null;
  const fromLabel = fromAccount && countryName ? `Depuis ${countryName}` : fromIp ? "Depuis ta position" : "Position inconnue";
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

  const TABS = [
    { id: "info", label: "Informations générales" },
    { id: "analyse", label: "Analyse en temps réel" },
    { id: "adresses", label: "Adresses" },
    { id: "stats", label: "Statistiques" },
    { id: "services", label: "Services" },
  ] as const;
  const tab = TABS.find((t) => t.id === onglet)?.id ?? "info";
  const href = (t: string) => `/dashboard/relais/${relay.id}${t === "info" ? "" : `?onglet=${t}`}`;
  const goto = (label: string, t: string) => ({ label, href: href(t) });
  const act = (label: string, action: string, danger = false) => ({ label, action: { id: relay.id, action }, danger });
  const sinceKey = relay.rotated_at ? fmtAgo(relay.rotated_at) : "Jamais régénérée";
  const trigger = { cut: "Coupure seulement", cut_lowbitrate: "Coupure et débit très bas", sensitive: "Sensible" }[relay.switch_trigger];
  const serverOk = server ? server.available && !server.maintenance : false;

  return (
    <DashPage>
      <PlanGate feature="relais">
        <Link href="/dashboard/relais" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground">
          <span aria-hidden="true">←</span> Retour à la liste des serveurs
        </Link>

        <header className="mb-8 mt-5 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className="h-page break-words">{relay.name}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {relay.live ? <span className="inline-flex items-center gap-2 text-live"><span className="live-dot" />En direct</span> : <span>{stateText}</span>}
              <ProtocolBadge protocol={relay.protocol} />
              {server && <span>{flag(server.cc)} {server.city}, {server.country}</span>}
            </p>
          </div>
        </header>
        <RelayActions relay={relay} bare />

        <TabsNav tabs={TABS.map((t) => ({ id: t.id, label: t.label, href: href(t.id) }))} current={tab} label="Sections du serveur" />

        {relay.archived && tab !== "info" ? (
          <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">Ce serveur est archivé : ses adresses ne marchent plus. Réactive-le depuis le menu « Plus » pour diffuser de nouveau.</p>
        ) : (
          <>
            {tab === "info" && (
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0 space-y-6">
                  {/* 1. De quoi se connecter */}
                  {!relay.archived && (
                    <Card title="Se connecter">
                      <div className="py-5">
                        <p className="mb-5 max-w-[62ch] text-sm leading-relaxed text-muted">
                          Colle l&apos;adresse correspondant à ton appareil ou à ton logiciel. Elle contient la clé de ce serveur : ne la partage pas et ne la montre pas en direct.
                        </p>
                        <RelayUrls relay={relay} />
                      </div>
                    </Card>
                  )}

                  {/* 2. Réglages modifiables */}
                  <Card title="Réglages">
                    <Setting label="Nom" help="Le nom de l'appareil qui utilise ce serveur." value={<span className="font-medium">{relay.name}</span>} button={<ActionButton action={{ id: relay.id, action: "rename" }}>Renommer</ActionButton>} />
                    <Setting label="Emplacement" help="Où ton flux est reçu. Changer garde les mêmes adresses." value={<span className="font-medium">{server ? `${flag(server.cc)} ${server.city}, ${server.country}` : relay.server}</span>} button={<ActionButton action={{ id: relay.id, action: "server" }}>Changer</ActionButton>} />
                    {!relay.archived && (
                      <Setting label="Bascule automatique" help="Quand OBS passe sur ta scène de secours." value={<span className="font-medium">{trigger}</span>} button={<ActionButton action={{ id: relay.id, action: "trigger" }}>Modifier</ActionButton>} />
                    )}
                    {!relay.archived && (
                      <Setting label="Clé de ce serveur" help={`Régénérer coupe les anciennes adresses tout de suite. ${sinceKey === "Jamais régénérée" ? "Jamais régénérée." : `Dernière fois : ${sinceKey}.`}`} button={<ActionButton action={{ id: relay.id, action: "rotate" }}>Régénérer</ActionButton>} />
                    )}
                  </Card>

                  {/* 3. Zone sensible, à part */}
                  <Card title="Archiver ou supprimer">
                    <Setting
                      label={relay.archived ? "Réactiver ce serveur" : "Archiver ce serveur"}
                      help={relay.archived ? "Ses adresses remarchent tout de suite et il compte de nouveau dans ta limite." : "Ses adresses cessent de marcher, il ne compte plus dans ta limite. Tu peux le réactiver."}
                      button={<ActionButton action={{ id: relay.id, action: "archive" }}>{relay.archived ? "Réactiver" : "Archiver"}</ActionButton>}
                    />
                    <Setting label="Supprimer ce serveur" help="Définitif. Tes directs restent dans l'historique." button={<ActionButton action={{ id: relay.id, action: "delete" }} danger>Supprimer</ActionButton>} />
                  </Card>
                </div>

                {/* Synthèse, toujours visible à droite */}
                <aside className="space-y-6 lg:sticky lg:top-6">
                  <Card title="En bref">
                    <dl className="divide-y divide-line">
                      <Fact label="Diffusion"><Pill tone={relay.live ? "live" : "idle"}>{relay.live ? "En direct" : relay.last_live_at ? "Hors direct" : "Jamais utilisé"}</Pill></Fact>
                      <Fact label="Statut"><Pill tone={relay.archived ? "idle" : "ok"}>{relay.archived ? "Archivé" : "Actif"}</Pill></Fact>
                      <Fact label="Serveur"><Pill tone={serverOk ? "ok" : server?.maintenance ? "warn" : "idle"}>{serverOk ? "Opérationnel" : server?.maintenance ? "En maintenance" : "Bientôt"}</Pill></Fact>
                      <Fact label="Protocole"><ProtocolBadge protocol={relay.protocol} /></Fact>
                      <Fact label={fromLabel}><span className={`font-mono tabular-nums ${TONE[tone]}`}>{estimate != null ? `~${estimate} ms` : "-"}</span></Fact>
                      <Fact label="Dernier direct">{relay.last_live_at ? fmtAgo(relay.last_live_at) : "Jamais"}</Fact>
                      <Fact label="Directs sur 30 jours">{fmtInt(sessions.length)}{totalS ? <span className="text-muted"> · {fmtDuration(totalS)}</span> : null}</Fact>
                      <Fact label="Créé le">{new Date(relay.created_at).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" })}</Fact>
                    </dl>
                  </Card>
                </aside>
              </div>
            )}

            {tab === "analyse" && <RelayAnalysis coreUrl={publicCoreUrl} relayId={relay.id} />}

            {tab === "adresses" && (
              <div className="max-w-3xl">
                <Card title="Adresses de connexion">
                  <div className="py-5">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <p className="max-w-[60ch] text-xs text-muted">Elles contiennent la clé de ce serveur : ne les partage pas et ne les montre pas en direct.</p>
                      <RowMenu label="Actions des adresses" items={[act("Copier l'adresse", "copy"), act("Régénérer la clé", "rotate", true)]} />
                    </div>
                    <RelayUrls relay={relay} />
                  </div>
                </Card>
              </div>
            )}

            {tab === "stats" && (
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
                <Card title="Statistiques sur 30 jours">
                  {([["Directs", fmtInt(sessions.length)], ["Temps de direct", totalS ? fmtDuration(totalS) : "-"], ["Débit moyen", avg ? `${fmtInt(avg)} kbit/s` : "-"], ["Débit de crête", peak ? `${fmtInt(peak)} kbit/s` : "-"], ["Coupures", fmtInt(cuts)]] as [string, string][]).map(([k, v]) => (
                    <Item key={k} label={k}>
                      <p className="font-mono text-lg tabular-nums text-foreground">{v}</p>
                    </Item>
                  ))}
                </Card>
                <Card title="Derniers directs">
                  {sessions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted">Aucun direct sur ce serveur.</p>
                  ) : (
                    sessions.slice(0, 8).map((s) => (
                      <Link key={s.id} href={`/dashboard/lives/${s.id}`} className="flex items-center justify-between gap-4 py-4 text-sm transition-colors hover:text-foreground">
                        <span>
                          <span className="block font-medium text-foreground">{fmtAgo(s.started_at)}</span>
                          <span className="mt-0.5 block text-xs text-muted">{s.reconnects} coupure{s.reconnects > 1 ? "s" : ""}</span>
                        </span>
                        <span className="text-right font-mono tabular-nums text-muted">{s.ended_at ? fmtDuration(s.duration_s) : "En cours"}<br />{fmtInt(s.avg_kbps)} kbit/s</span>
                      </Link>
                    ))
                  )}
                </Card>
              </div>
            )}

            {tab === "services" && (
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
                <Card title="Disponibilité des services">
                  {services.map((sv) => (
                    <Item key={sv.name} label={sv.name}>
                      <Pill tone={sv.ok === true ? "ok" : sv.ok === false ? "bad" : "idle"}>{sv.text}</Pill>
                    </Item>
                  ))}
                </Card>
                <Card title="Serveur utilisé">
                  <Item label="Emplacement"><p><strong>{server ? `${flag(server.cc)} ${server.city}, ${server.country}` : relay.server}</strong></p></Item>
                  <Item label="Identifiant"><p><strong>{relay.server}</strong></p></Item>
                  <Item label="Adresse"><p className="break-all" data-sensitive><strong>{relay.host}</strong></p></Item>
                  <Item label="Latence estimée" hint={fromLabel}><p className={`font-mono text-lg tabular-nums ${TONE[tone]}`}>{estimate != null ? `~${estimate} ms` : "-"}</p></Item>
                </Card>
              </div>
            )}
          </>
        )}
      </PlanGate>
    </DashPage>
  );
}
