import type { Metadata } from "next";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import DjiHub, { type RtmpRelay } from "@/components/dji/DjiHub";
import PlanGate from "@/components/plans/PlanGate";
import { requireUser } from "@/lib/auth/dal";
import { hasCore, listRelays } from "@/lib/core";

export const metadata: Metadata = { title: "Caméras DJI", robots: { index: false } };

// Caméras DJI (menu Direct) : autant de caméras que tu veux, chacune liée à un relais RTMP, lancées en Bluetooth
// (protocole de Moblin, licence MIT). ?relais=<id> : relais présélectionné pour l'ajout (lien depuis la fiche relais).
export default async function DjiPage({ searchParams }: { searchParams: Promise<{ relais?: string }> }) {
  const user = await requireUser("/dashboard/dji");
  const { relais } = await searchParams;
  let relays: RtmpRelay[] = [];
  let down = !hasCore;
  if (hasCore) {
    try {
      relays = (await listRelays(user.id))
        .filter((r) => r.protocol === "rtmp" && !r.archived && r.urls.rtmp_url)
        .map((r) => ({ id: r.id, name: r.name, rtmpUrl: r.urls.rtmp_url! }));
    } catch (e) {
      console.error("dji : Core", e);
      down = true;
    }
  }

  return (
    <DashPage>
      <DashHeader lead="Caméras" hl="DJI" sub="Osmo Pocket, Osmo Action, Osmo 360 : chaque caméra diffuse directement vers son relais, même page fermée." />
      <PlanGate feature="dji">
        {down ? <p className="text-sm text-muted">Le relais ne répond pas pour le moment. Réessaie dans quelques minutes.</p> : <DjiHub relays={relays} focusRelay={relais} />}
      </PlanGate>
      <p className="mt-10 max-w-[65ch] text-xs leading-relaxed text-muted">
        Bluetooth : Android (Chrome) et ordinateur (Chrome, Edge). Protocole issu de Moblin (licence MIT, Erik Moqvist).
      </p>
    </DashPage>
  );
}
