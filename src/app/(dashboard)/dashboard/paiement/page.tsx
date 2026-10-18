import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CheckoutEmbed from "@/components/dashboard/CheckoutEmbed";
import { Column } from "@/components/dashboard/kit";
import { requireUser } from "@/lib/auth/dal";
import { CATALOG, INTERVALS, isTier } from "@/lib/billing";

export const metadata: Metadata = { title: "Paiement", robots: { index: false } };

// Paiement d'un abonnement : formulaire Stripe intégré au site. ?formule=basic|paid|extra&periode=month|year
export default async function PaiementPage({ searchParams }: { searchParams: Promise<{ formule?: string; periode?: string }> }) {
  await requireUser("/dashboard/compte?onglet=formule");
  const { formule, periode } = await searchParams;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!isTier(formule) || (periode !== "month" && periode !== "year") || !publishableKey) redirect("/dashboard/compte?onglet=formule");
  const c = CATALOG[formule];
  return (
    <Column max={720}>
      <Link href="/dashboard/compte?onglet=formule" className="text-[13px] text-muted hover:text-foreground">‹ Retour aux formules</Link>
      <h1 className="mt-6 text-[28px] font-semibold tracking-tight">{c.name}</h1>
      <p className="mt-1 text-[14px] text-muted">{c.prices[periode].amount} {INTERVALS[periode].per}. Sans engagement : tu peux annuler quand tu veux.</p>
      <div className="mt-8">
        <CheckoutEmbed publishableKey={publishableKey} tier={formule} interval={periode} />
      </div>
    </Column>
  );
}
