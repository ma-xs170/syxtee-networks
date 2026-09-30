import type { Metadata } from "next";
import AnalyzerClient from "@/components/analyseur/AnalyzerClient";
import { DashHeader, DashPage, SectionTabs } from "@/components/dashboard/ui";
import { scanTabs } from "@/lib/dashboard-nav";
import { requireUser } from "@/lib/auth/dal";
import { hasCore, publicCoreUrl } from "@/lib/core";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Analyseur réseau", robots: { index: false } };

// Outils → Analyseur réseau : même moteur que le mode Scan de SYXTEE Cam, avec le compte (scan continu, carte).
export default async function AnalyseurPage() {
  await requireUser("/dashboard/analyseur");
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_coverage");
  const mine = (data as { measurements?: number; hexes?: number } | null) ?? {};
  return (
    <DashPage>
      <SectionTabs tabs={scanTabs} current="/dashboard/analyseur" label="Scanner" />
      <DashHeader lead="Analyseur" hl="réseau" sub="Débit, latence et opérateur là où tu es. En scan continu, tes mesures 4G/5G font avancer la carte communautaire." />
      {hasCore ? (
        <AnalyzerClient coreUrl={publicCoreUrl} account totals={{ measurements: mine.measurements ?? 0, hexes: mine.hexes ?? 0 }} />
      ) : (
        <p className="text-sm text-muted">L&apos;analyseur n&apos;est pas encore branché au serveur de mesure.</p>
      )}
    </DashPage>
  );
}
