import type { Metadata } from "next";
import LinkDevices from "@/components/dashboard/LinkDevices";
import { DashPage } from "@/components/dashboard/ui";
import { Card } from "@/components/ui/Card";
import { ToastProvider } from "@/components/ui/Toast";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import BoxEmpty from "./BoxEmpty";

export const metadata: Metadata = { title: "Appareils", robots: { index: false } };

// Appareils : l'Encodeur (boîtier, en développement) (pas encore de pairing côté serveur : état vide) et les postes OBS reliés au compte.
export default async function AppareilsPage() {
  await requireUser("/dashboard/appareils");
  return (
    <ToastProvider>
      <DashPage>
        <h1 className="mb-8 text-3xl font-medium tracking-[-0.03em] sm:text-[32px]">Appareils</h1>
        <div className="grid gap-6">
          <Card title="Encodeur">
            <BoxEmpty />
          </Card>
          <Card title="Postes OBS" id="postes">
            <p className="mb-2 text-sm leading-relaxed text-muted">Les ordinateurs reliés à ton compte avec SYXTEE Link. Révoquer un poste coupe sa connexion tout de suite.</p>
            <LinkDevices coreUrl={publicCoreUrl} />
          </Card>
        </div>
      </DashPage>
    </ToastProvider>
  );
}
