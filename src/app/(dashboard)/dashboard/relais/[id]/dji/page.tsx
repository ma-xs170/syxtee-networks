import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLink, DashHeader, DashPage } from "@/components/dashboard/ui";
import DjiSetup, { type RtmpRelay } from "@/components/dji/DjiSetup";
import PlanGate from "@/components/plans/PlanGate";
import { requireUser } from "@/lib/auth/dal";
import { hasCore, listRelays } from "@/lib/core";

export const metadata: Metadata = { title: "Configurer une DJI", robots: { index: false } };

// « Configurer une DJI » : envoie l'URL RTMP d'un relais à une caméra DJI en Bluetooth (protocole de Moblin, MIT).
export default async function DjiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/relais/${id}/dji`);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !hasCore) notFound();
  let relays: RtmpRelay[] = [];
  try {
    relays = (await listRelays(user.id))
      .filter((r) => r.protocol === "rtmp" && !r.archived && r.urls.rtmp_url)
      .map((r) => ({ id: r.id, name: r.name, rtmpUrl: r.urls.rtmp_url! }));
  } catch (e) {
    console.error("dji : Core", e);
  }
  if (!relays.some((r) => r.id === id)) notFound();

  return (
    <DashPage>
      <div className="mb-6">
        <ArrowLink href={`/dashboard/relais/${id}`}>Retour au relais</ArrowLink>
      </div>
      <DashHeader lead="Configurer une" hl="DJI" sub="Ta caméra se connecte au réseau et diffuse directement vers ton relais SYXTEE, sans l'app DJI Mimo." />
      <PlanGate feature="dji">
        <DjiSetup relays={relays} relayId={id} />
      </PlanGate>
      <p className="mt-8 max-w-[65ch] text-xs leading-relaxed text-muted">
        Compatible Android (Chrome) et ordinateur (Chrome, Edge). Protocole Bluetooth issu de Moblin (licence MIT, Erik Moqvist).
      </p>
    </DashPage>
  );
}
