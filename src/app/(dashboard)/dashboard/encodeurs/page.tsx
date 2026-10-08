import type { Metadata } from "next";
import EncoderApp from "@/components/encoder/EncoderApp";
import { DashPage } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";

export const metadata: Metadata = { title: "Encodeurs", robots: { index: false } };

// Encodeurs : appairage par code, liste des boîtiers et tableau de bord de chacun.
// Formule Gratuit : interface visible mais grisée. Les postes OBS se gèrent dans Contrôle à distance.
export default async function EncodeursPage() {
  const [, plan] = await Promise.all([requireUser("/dashboard/encodeurs"), getPlan()]);
  return (
    <DashPage>
      <h1 className="mb-8 text-3xl font-medium tracking-[-0.03em] sm:text-[32px]">Encodeurs</h1>
      <div className="grid gap-6">
        <EncoderApp locked={plan.id === "free"} />
      </div>
    </DashPage>
  );
}
