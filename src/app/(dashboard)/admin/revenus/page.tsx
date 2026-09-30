import type { Metadata } from "next";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { PLANS, type PlanId } from "@/lib/plans";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin · Revenus", robots: { index: false } };

// Revenus : Stripe pas encore branché → montants à 0 et « Stripe non connecté ».
// Branchement prévu : clé restreinte en lecture (STRIPE_RESTRICTED_KEY) + webhooks vers applyBillingEvent (plan-admin.ts).
// Les abonnements par formule, eux, viennent déjà de la base.

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const stripe = !!process.env.STRIPE_RESTRICTED_KEY;

function months() {
  const out: string[] = [];
  const d = new Date();
  for (let i = 11; i >= 0; i--) out.push(new Date(d.getFullYear(), d.getMonth() - i, 1).toLocaleDateString("fr-FR", { month: "short" }));
  return out;
}

export default async function AdminRevenusPage() {
  await requireAdmin();
  const counts: Partial<Record<PlanId, number>> = {};
  if (hasAdmin) {
    const db = createAdminClient();
    await Promise.all(
      (["free", "beta", "paid", "partner"] as PlanId[]).map(async (p) => {
        const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("plan", p);
        counts[p] = count ?? 0;
      }),
    );
  }

  return (
    <DashPage>
      <DashHeader lead="Revenus" hl={stripe ? "du mois" : "0 €"} sub={stripe ? undefined : "Stripe non connecté : les montants s'afficheront une fois le paiement branché."} />
      {!stripe && (
        <Tile className="mb-4">
          <p className="text-sm">
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted">Stripe non connecté</span>
            <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="ml-3 underline-offset-4 hover:underline">
              Connecter →
            </a>
          </p>
          <p className="mt-2 max-w-[65ch] text-sm text-muted">Crée une clé restreinte en lecture seule, ajoute-la dans Vercel (STRIPE_RESTRICTED_KEY), puis branche les webhooks d&apos;abonnement.</p>
        </Tile>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Chiffre d'affaires du mois", 0],
          ["MRR", 0],
          ["Remboursements (mois)", 0],
          ["Panier moyen", 0],
        ].map(([label, v]) => (
          <Tile key={label as string}>
            <TileLabel>{label as string}</TileLabel>
            <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{eur.format(v as number)}</p>
          </Tile>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Tile>
          <TileLabel>Historique mensuel</TileLabel>
          <div className="mt-6 grid h-40 grid-cols-12 items-end gap-2" aria-label="Chiffre d'affaires par mois : 0 € sur 12 mois">
            {months().map((m) => (
              <div key={m} className="flex h-full flex-col justify-end gap-2 text-center">
                <div className="h-px bg-white/30" />
                <span className="font-mono text-[10px] text-muted">{m}</span>
              </div>
            ))}
          </div>
        </Tile>
        <Tile>
          <TileLabel>Comptes par formule</TileLabel>
          <dl className="mt-4 divide-y divide-line text-sm">
            {(["paid", "partner", "beta", "free"] as PlanId[]).map((p) => (
              <div key={p} className="flex justify-between py-2.5">
                <dt className="text-muted">{PLANS[p].name}</dt>
                <dd className="font-mono tabular-nums">{counts[p] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Tile>
      </div>
    </DashPage>
  );
}
