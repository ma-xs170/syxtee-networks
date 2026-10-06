import type { Metadata } from "next";
import { cookies } from "next/headers";
import LowDataBoard from "@/components/dashboard/LowDataBoard";
import LowDataToggle from "@/components/dashboard/LowDataToggle";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { LOW_DATA_COOKIE } from "@/lib/low-data";

export const metadata: Metadata = { title: "Connexion basse", robots: { index: false } };

export default async function LowDataPage() {
  await requireUser("/dashboard/connexion-basse");
  const on = (await cookies()).get(LOW_DATA_COOKIE)?.value === "1";
  return (
    <DashPage className="max-w-2xl">
      <DashHeader lead="Connexion" hl="basse" sub="Relais actifs, débit et latence en texte seul. Quelques centaines d'octets par mise à jour." />
      <LowDataBoard coreUrl={publicCoreUrl} />
      <div className="mt-10 border-t border-line pt-5">
        <LowDataToggle initial={on} variant={on ? "link" : "box"} />
      </div>
    </DashPage>
  );
}
