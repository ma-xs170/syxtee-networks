import type { Metadata } from "next";
import Overview from "@/components/dashboard/Overview";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import { getPlan } from "@/lib/auth/plan";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { getOverview } from "@/lib/dashboard-overview";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Vue d'ensemble : statut du direct, alertes, activité, derniers directs, URLs, santé.
export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const profile = (await getProfile())!;
  const initial = await getOverview(user.id, profile, "7d", await getPlan());
  const first = profile.first_name?.trim();
  return (
    <DashPage>
      {/* Prénom pas encore renseigné : « Salut. » tout court. */}
      {first ? <DashHeader lead="Salut" hl={`${first}.`} highlight /> : <DashHeader lead="Salut." hl="" />}
      <Overview initial={initial} />
    </DashPage>
  );
}
