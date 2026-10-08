import type { Metadata } from "next";
import EncoderApp from "@/components/encoder/EncoderApp";
import { DashPage } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";

export const metadata: Metadata = { title: "Encodeur", robots: { index: false } };

// Dashboard client de l'Encodeur : appairage par code, liste des boîtiers, vue boîtier (mêmes écrans que la démo publique).
// Formule Gratuit : interface visible mais grisée. Payant et Partenaire : accès complet. Données : provider mock tant que le backend n'est pas prêt.
export default async function EncodeurPage() {
  const [, plan] = await Promise.all([requireUser("/dashboard/encodeur"), getPlan()]);
  const locked = plan.id === "free";
  return (
    <DashPage>
      <h1 className="mb-8 text-3xl font-medium tracking-[-0.03em] sm:text-[32px]">Encodeur</h1>
      <EncoderApp locked={locked} />
    </DashPage>
  );
}
