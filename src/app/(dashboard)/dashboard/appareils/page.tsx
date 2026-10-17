import type { Metadata } from "next";
import LinkDevices from "@/components/dashboard/LinkDevices";
import { ButtonLink } from "@/components/ui/Button";
import { DashPage } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = { title: "Appareils", robots: { index: false } };

// Appareils : les ordinateurs reliés au compte avec SYXTEE Link (Contrôle à distance), leur état, le renommage et la révocation.
export default async function AppareilsPage() {
  await requireUser("/dashboard/appareils");
  return (
    <DashPage>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="h-page">Appa<em>reils</em></h1>
        <ButtonLink href="/dashboard/direct" variant="secondary">Ouvrir le contrôle à distance</ButtonLink>
      </div>
      <p className="-mt-4 mb-2 max-w-2xl text-sm text-muted">Les ordinateurs connectés à ton compte pour le contrôle à distance d&apos;OBS.</p>
      <LinkDevices coreUrl={publicCoreUrl} />
    </DashPage>
  );
}
