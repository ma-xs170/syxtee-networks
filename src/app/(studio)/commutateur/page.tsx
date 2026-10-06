import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { LiveStatusProvider } from "@/components/dashboard/LiveStatus";
import CloudObs, { type RealRelay } from "@/components/cloud/CloudObs";
import PlanGate from "@/components/plans/PlanGate";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { getMixSettings } from "@/lib/mix-settings";
import { loadRelays } from "@/lib/relays";

export const metadata: Metadata = { title: "SYXTEE COMMUTATEUR", robots: { index: false } };

// SYXTEE COMMUTATEUR = OBS Cloud : l'interface d'OBS Studio 100 % dans le navigateur (scènes, sources, mélangeur, transitions,
// contrôles) avec le Commutateur multi-relais comme dock, plein écran (sans barre latérale du dashboard ni nav du site).
// Maquette : la liste des relais est réelle, la composition est simulée.
export default async function CommutateurPage() {
  const user = await requireUser("/commutateur");
  // « À venir » : fermé au public, seul l'admin voit la maquette.
  if (!isAdminEmail(user.email)) redirect("/syxtee-mix");
  const profile = await getProfile();
  const [{ relays }, audio] = await Promise.all([loadRelays(user.id), getMixSettings(user.id)]);
  const real: RealRelay[] = relays.filter((r) => !r.archived).map((r) => ({ id: r.id, name: r.name, protocol: r.protocol, live: r.live }));
  const account = profile?.twitch_display_name || profile?.username || user.email || "compte";

  return (
    <LiveStatusProvider coreUrl={publicCoreUrl}>
      <div className="mx-auto w-full max-w-[1920px]">
        <PlanGate feature="commutateur">
          <CloudObs account={account} real={real} coreUrl={publicCoreUrl} initialAudio={audio} />
        </PlanGate>
      </div>
    </LiveStatusProvider>
  );
}
