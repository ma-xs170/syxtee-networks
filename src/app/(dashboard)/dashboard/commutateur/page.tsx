import type { Metadata } from "next";
import MixApp, { type RealRelay } from "@/components/mix/MixApp";
import { DashHeader } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { loadRelays } from "@/lib/relays";

export const metadata: Metadata = { title: "Commutateur", robots: { index: false } };

// Commutateur multi-relais : toutes tes caméras sur un écran, PROGRAM / PREVIEW, transitions, mixeur audio,
// PROTECTION et un lien RTMP unique pour OBS. Maquette : la liste des relais est réelle, la composition est simulée.
export default async function CommutateurPage() {
  const user = await requireUser("/dashboard/commutateur");
  const profile = await getProfile();
  const { relays } = await loadRelays(user.id);
  const real: RealRelay[] = relays.filter((r) => !r.archived).map((r) => ({ id: r.id, name: r.name, protocol: r.protocol, live: r.live }));
  const account = profile?.twitch_display_name || profile?.username || user.email || "compte";

  return (
    <div className="mx-auto w-full max-w-[1700px] px-4 pb-20 pt-8 sm:px-6">
      <PlanGate feature="commutateur">
        <DashHeader lead="Le" hl="commutateur" sub="Toutes tes caméras sur un écran : choisis le PROGRAM, prépare le PREVIEW, règle l'audio." />
        <MixApp account={account} real={real} coreUrl={publicCoreUrl} />
      </PlanGate>
    </div>
  );
}
