import type { Metadata } from "next";
import { LiveStatusProvider } from "@/components/dashboard/LiveStatus";
import MixApp, { type RealRelay } from "@/components/mix/MixApp";
import PlanGate from "@/components/plans/PlanGate";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { loadRelays } from "@/lib/relays";

export const metadata: Metadata = { title: "SYXTEE COMMUTATEUR", robots: { index: false } };

// SYXTEE COMMUTATEUR : page à part, plein écran (sans barre latérale du dashboard ni nav du site). Toutes tes caméras sur un
// écran : PROGRAM / PREVIEW, transitions, mixeur audio, PROTECTION et un lien RTMP unique pour OBS.
// Maquette : la liste des relais est réelle, la composition est simulée.
export default async function CommutateurPage() {
  const user = await requireUser("/commutateur");
  const profile = await getProfile();
  const { relays } = await loadRelays(user.id);
  const real: RealRelay[] = relays.filter((r) => !r.archived).map((r) => ({ id: r.id, name: r.name, protocol: r.protocol, live: r.live }));
  const account = profile?.twitch_display_name || profile?.username || user.email || "compte";

  return (
    <LiveStatusProvider coreUrl={publicCoreUrl}>
      <div className="mx-auto w-full max-w-[1920px]">
        <PlanGate feature="commutateur">
          <MixApp account={account} real={real} coreUrl={publicCoreUrl} />
        </PlanGate>
      </div>
    </LiveStatusProvider>
  );
}
