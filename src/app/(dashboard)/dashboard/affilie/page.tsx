import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { getMyAffiliate, KIT_PATH } from "@/lib/affiliates";
import { site } from "@/lib/site";
import AffiliatePanel from "./AffiliatePanel";

export const metadata: Metadata = { title: "Affilié", robots: { index: false } };

// Espace Affilié : réservé aux comptes invités par l'équipe (404 sinon). Lien à partager, kit, pseudo et nom d'URL.
export default async function AffiliatePage() {
  await requireUser("/dashboard/affilie");
  const me = await getMyAffiliate();
  if (!me) notFound();
  return (
    <DashPage>
      <DashHeader lead="Programme" hl="affilié" sub={`${me.clicks} clic${me.clicks > 1 ? "s" : ""} sur ton lien. Chaque visiteur arrive sur une page à ton nom, avec les formules SYXTEE.`} />
      <AffiliatePanel origin={site.url} slug={me.slug} pseudo={me.display_name} isNew={!me.seen_at} kit={KIT_PATH} />
    </DashPage>
  );
}
