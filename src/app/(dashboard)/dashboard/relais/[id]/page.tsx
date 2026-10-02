import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MireStatus from "@/components/dashboard/MireStatus";
import { SessionList } from "@/components/dashboard/sessions";
import StreamHealth from "@/components/dashboard/StreamHealth";
import StreamPreview from "@/components/dashboard/StreamPreview";
import { ArrowLink, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import RelayActions from "@/components/relais/RelayActions";
import { ProtocolBadge, ServerLabel } from "@/components/relais/RelayList";
import RelayUrls from "@/components/relais/RelayUrls";
import { requireUser } from "@/lib/auth/dal";
import { getRelay, hasCore, publicCoreUrl, type RelayView } from "@/lib/core";
import { fmtAgo } from "@/lib/dashboard-data";
import { listSessions } from "@/lib/dashboard-overview";
import PlanGate from "@/components/plans/PlanGate";

export const metadata: Metadata = { title: "Relais", robots: { index: false } };

export default async function RelayPage({ params }: PageProps<"/dashboard/relais/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/relais/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !hasCore) notFound();
  let relay: RelayView | null = null;
  let down = false;
  try {
    relay = await getRelay(user.id, id);
  } catch (e) {
    console.error("relais : Core", e);
    down = true;
  }
  if (!relay && !down) notFound();
  const sessions = relay ? await listSessions({ relayId: relay.id, limit: 10 }) : [];

  return (
    <DashPage>
      <PlanGate feature="relais">
      <div className="mb-6">
        <ArrowLink href="/dashboard/relais">Mes relais</ArrowLink>
      </div>
      {!relay ? (
        <p className="text-sm text-muted">Le relais ne répond pas pour le moment. Réessaie dans quelques minutes.</p>
      ) : (
        <>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="break-words h-section">
                {relay.name}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
                <ProtocolBadge protocol={relay.protocol} />
                <ServerLabel id={relay.server} />
                <span>{relay.archived ? "Archivé" : relay.last_live_at ? `Dernier live ${fmtAgo(relay.last_live_at)}` : "Jamais utilisé"}</span>
              </p>
            </div>
            <RelayActions relay={relay} showView={false} />
          </div>

          {relay.archived ? (
            <Tile>
              <p className="text-sm text-muted">Ce relais est archivé : ses URLs ne marchent plus. Réactive-le pour diffuser de nouveau (menu Plus).</p>
            </Tile>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Tile className="lg:col-span-2">
                <TileLabel>Tes URLs</TileLabel>
                <p className="mt-2 text-sm text-muted">Elles contiennent la clé de ce relais : ne les partage pas et ne les montre pas en live.</p>
                <div className="mt-6">
                  <RelayUrls relay={relay} />
                </div>
              </Tile>
              <div className="space-y-4">
                <StreamPreview coreUrl={publicCoreUrl} relayId={relay.id} />
                {relay.protocol === "rtmp" && (
                  <Tile>
                    <TileLabel>Caméra externe</TileLabel>
                    <p className="mt-3 text-sm text-muted">Osmo Pocket, Osmo Action, Osmo 360 : envoie l&apos;URL de ce relais à ta caméra en Bluetooth, sans l&apos;app DJI Mimo.</p>
                    <div className="mt-4">
                      <ArrowLink href={`/dashboard/dji?relais=${relay.id}`}>Configurer une DJI</ArrowLink>
                    </div>
                  </Tile>
                )}
                <Tile>
                  <TileLabel>Mire de coupure</TileLabel>
                  <div className="mt-4">
                    <MireStatus available={relay.regie_available} />
                  </div>
                </Tile>
              </div>
              <div className="lg:col-span-3">
                <StreamHealth coreUrl={publicCoreUrl} relayId={relay.id} />
              </div>
            </div>
          )}

          <Tile className="mt-4">
            <TileLabel right={<ArrowLink href={`/dashboard/lives?relay=${relay.id}`}>Tout l&apos;historique</ArrowLink>}>Derniers directs</TileLabel>
            <div className="mt-3">
              {sessions.length ? <SessionList sessions={sessions} /> : <p className="text-sm text-muted">Aucun direct sur ce relais pour l&apos;instant.</p>}
            </div>
          </Tile>
        </>
      )}
    </PlanGate>
    </DashPage>
  );
}
