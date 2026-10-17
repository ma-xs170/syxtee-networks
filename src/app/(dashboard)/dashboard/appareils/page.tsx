import type { Metadata } from "next";
import EncoderApp from "@/components/encoder/EncoderApp";
import { ButtonLink } from "@/components/ui/Button";
import { DashPage } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";

export const metadata: Metadata = { title: "Encodeurs", robots: { index: false } };

// Encodeurs : appairage par code, liste des boîtiers et tableau de bord de chacun.
// Formule Gratuit : interface visible mais grisée. Les postes OBS se gèrent dans Contrôle à distance.
export default async function EncodeursPage() {
  const [, plan] = await Promise.all([requireUser("/dashboard/appareils"), getPlan()]);
  return (
    <DashPage>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="h-page">Enco<em>deurs</em></h1>
        <ButtonLink href="/encodeur" variant="secondary">Voir les encodeurs disponibles</ButtonLink>
      </div>
      <div className="grid gap-6">
        <EncoderApp locked={plan.id === "free"} />
      </div>
    </DashPage>
  );
}
