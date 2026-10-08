import type { Metadata } from "next";
import ActivationCard from "@/components/encoder/ActivationCard";
import EncoderApp from "@/components/encoder/EncoderApp";
import { DashPage } from "@/components/dashboard/ui";
import { product } from "@/config/product";
import { requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Encodeurs", robots: { index: false } };

// Encodeurs : appairage par code, liste des boîtiers, tableau de bord de chacun et activation par code (mois d'abonnement offerts).
// Formule Gratuit : interface visible mais grisée. Les postes OBS se gèrent dans Contrôle à distance.
export default async function EncodeursPage() {
  const [user, plan] = await Promise.all([requireUser("/dashboard/encodeurs"), getPlan()]);
  // Codes d'activation liés à ses commandes et pas encore utilisés.
  let codes: string[] = [];
  if (hasAdmin) {
    const { data } = await createAdminClient().from("encoder_activation_codes").select("code").eq("buyer_id", user.id).is("used_by", null);
    codes = (data ?? []).map((r) => r.code as string);
  }
  return (
    <DashPage>
      <h1 className="mb-8 text-3xl font-medium tracking-[-0.03em] sm:text-[32px]">Encodeurs</h1>
      <div className="grid gap-6">
        <EncoderApp locked={plan.id === "free"} />
        <ActivationCard codes={codes} bonusMonths={product.bonusMonths} />
      </div>
    </DashPage>
  );
}
