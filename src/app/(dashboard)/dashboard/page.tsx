import type { Metadata } from "next";
import Overview from "@/components/dashboard/Overview";
import Greeting from "@/components/dashboard/Greeting";
import { DashPage } from "@/components/dashboard/ui";
import { regionList, serverNow, validTimezone } from "@/lib/regions";
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
  const region = profile.country ? regionList().find((r) => r.code === profile.country) : undefined;
  return (
    <DashPage>
      {/* Prénom pas encore renseigné : « Bonjour. » tout court. Fuseau absent (ancien compte) : Europe/Paris. */}
      <Greeting now={serverNow()} timezone={validTimezone(profile.timezone)} name={first || undefined} flag={region?.flag} region={region?.name} />
      <Overview initial={initial} chat={{ twitch: profile.twitch_login ?? "", kick: profile.kick ?? "", youtube: "" }} />
    </DashPage>
  );
}
