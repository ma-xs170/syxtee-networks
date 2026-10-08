import type { Metadata } from "next";
import ActivationCard from "@/components/encoder/ActivationCard";
import EncoderApp from "@/components/encoder/EncoderApp";
import LinkDevices from "@/components/dashboard/LinkDevices";
import { DashPage } from "@/components/dashboard/ui";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { product } from "@/config/product";
import { requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";
import { publicCoreUrl } from "@/lib/core";
import { DEMO_URL } from "@/lib/demo-url";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Appareils", robots: { index: false } };

// Appareils : un seul endroit pour les Encodeurs (appairage par code, liste, tableau de bord) et les postes OBS reliés au compte.
// Formule Gratuit : Encodeurs visibles mais grisés. L'espace démo de l'Encodeur est ouvert à tous les comptes.
export default async function AppareilsPage() {
  const [user, plan] = await Promise.all([requireUser("/dashboard/appareils"), getPlan()]);
  // Codes d'activation liés à ses commandes et pas encore utilisés.
  let codes: string[] = [];
  if (hasAdmin) {
    const { data } = await createAdminClient().from("encoder_activation_codes").select("code").eq("buyer_id", user.id).is("used_by", null);
    codes = (data ?? []).map((r) => r.code as string);
  }
  return (
    <DashPage>
      <h1 className="mb-8 text-3xl font-medium tracking-[-0.03em] sm:text-[32px]">Appareils</h1>
      <div className="grid gap-6">
        <section aria-labelledby="enc">
          <h2 id="enc" className="mb-4 text-lg font-semibold tracking-tight">Encodeurs</h2>
          <EncoderApp locked={plan.id === "free"} />
        </section>
        <ActivationCard codes={codes} bonusMonths={product.bonusMonths} />
        <Card title="Espace démo de l'Encodeur">
          <p className="max-w-[60ch] text-sm leading-relaxed text-muted">Pas encore d&apos;Encodeur ? Essaie son tableau de bord dans une page à part : connexions, caméra, audio, température, tout est simulé.</p>
          <div className="mt-5"><ButtonLink href={DEMO_URL} external>Ouvrir la démo</ButtonLink></div>
        </Card>
        <Card title="Postes OBS" id="postes">
          <p className="mb-2 text-sm leading-relaxed text-muted">Les ordinateurs reliés à ton compte avec SYXTEE Link. Révoquer un poste coupe sa connexion tout de suite.</p>
          <LinkDevices coreUrl={publicCoreUrl} />
        </Card>
      </div>
    </DashPage>
  );
}
