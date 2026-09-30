import type { Metadata } from "next";
import { SectionTabs } from "@/components/dashboard/ui";
import ScannerClient from "@/components/scanner/ScannerClient";
import { scanTabs } from "@/lib/dashboard-nav";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { hasCore, publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = { title: "Scanner réseau", robots: { index: false } };

// Outils → Scanner réseau : scan 4G / 5G plein écran pour la carte communautaire. Ouvert à tous les comptes,
// y compris gratuits (seule fonction active pour eux).
export default async function ScannerPage() {
  await requireUser("/dashboard/scanner");
  const profile = await getProfile();
  if (!hasCore)
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-medium">Le Scanner n&apos;est pas encore branché au serveur de mesure.</p>
      </div>
    );
  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:pt-8">
        <SectionTabs tabs={scanTabs} current="/dashboard/scanner" label="Scanner" className="" />
      </div>
      <ScannerClient coreUrl={publicCoreUrl} declared={profile?.mobile_operator ?? null} />
    </>
  );
}
