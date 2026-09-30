import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLink, DashHeader, DashPage, Tile } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import { requireUser } from "@/lib/auth/dal";
import { hasCore, listRelays } from "@/lib/core";

export const metadata: Metadata = { title: "Caméras DJI", robots: { index: false } };

// Entrée « Caméras DJI » du menu Direct : ouvre l'assistant sur le premier relais RTMP actif,
// ou explique qu'il faut d'abord créer un relais RTMP (la caméra diffuse en RTMP).
export default async function DjiEntryPage() {
  const user = await requireUser("/dashboard/dji");
  let target: string | null = null;
  let down = !hasCore;
  if (hasCore) {
    try {
      target = (await listRelays(user.id)).find((r) => r.protocol === "rtmp" && !r.archived)?.id ?? null;
    } catch (e) {
      console.error("dji : Core", e);
      down = true;
    }
  }
  if (target) redirect(`/dashboard/relais/${target}/dji`);

  return (
    <DashPage>
      <DashHeader lead="Caméras" hl="DJI" sub="Osmo Pocket, Osmo Action, Osmo 360 : la caméra diffuse directement vers ton relais, sans l'app DJI Mimo." />
      <PlanGate feature="dji">
        <Tile>
          {down ? (
            <p className="text-sm text-muted">Le relais ne répond pas pour le moment. Réessaie dans quelques minutes.</p>
          ) : (
            <>
              <p className="max-w-[60ch] text-sm leading-relaxed">Une caméra DJI diffuse en RTMP : crée d&apos;abord un relais RTMP, puis reviens ici pour la connecter en Bluetooth.</p>
              <div className="mt-5 flex flex-wrap gap-6">
                <ArrowLink href="/dashboard/relais">Créer un relais RTMP</ArrowLink>
                <ArrowLink href="/docs/dji">Voir le guide</ArrowLink>
              </div>
            </>
          )}
        </Tile>
      </PlanGate>
    </DashPage>
  );
}
