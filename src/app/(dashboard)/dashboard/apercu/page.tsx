import type { Metadata } from "next";
import StreamPreview from "@/components/dashboard/StreamPreview";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { hasCore, publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = { title: "Aperçu", robots: { index: false } };

export default async function ApercuPage() {
  await requireUser("/dashboard/apercu");
  return (
    <DashPage>
      <DashHeader lead="Ton flux en" hl="direct" sub="Une image toutes les 3 s, visible par toi seul." />
      <div className="max-w-4xl">
        {hasCore ? <StreamPreview coreUrl={publicCoreUrl} /> : <p className="text-sm text-muted">Le relais n&apos;est pas encore branché au dashboard.</p>}
      </div>
    </DashPage>
  );
}
