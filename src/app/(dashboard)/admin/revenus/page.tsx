import type { Metadata } from "next";
import Link from "next/link";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { CATALOG, TIERS, isTier, mrrCents, type Interval, type Tier } from "@/lib/billing";
import { PLANS, type PlanId } from "@/lib/plans";
import { hasStripe } from "@/lib/stripe";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin · Revenus", robots: { index: false } };

// Revenus : calculés depuis la base (factures payées reçues par webhook, abonnements en cours), sans clé de lecture Stripe.
// Remboursements et litiges : dans le tableau de bord Stripe.

const eur = (cents: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
type Payment = { invoice_id: string; user_id: string | null; amount_cents: number; interval: string | null; paid_at: string };

function last12Months(now = new Date()) {
  return Array.from({ length: 12 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + k, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("fr-FR", { month: "short" }), start: d };
  });
}

export default async function AdminRevenusPage() {
  await requireAdmin();
  const months = last12Months();
  const counts: Partial<Record<PlanId, number>> = {};
  let payments: Payment[] = [];
  const subs: Partial<Record<Tier, Partial<Record<Interval, number>>>> = {};
  if (hasAdmin) {
    const db = createAdminClient();
    const [pay, live] = await Promise.all([
      db.from("billing_payments").select("invoice_id, user_id, amount_cents, interval, paid_at").gte("paid_at", months[0].start.toISOString()).order("paid_at", { ascending: false }).limit(5000),
      db.from("profiles").select("plan, billing_interval").in("billing_status", ["active", "past_due"]).limit(10000),
      ...(["free", "basic", "beta", "paid", "extra", "partner"] as PlanId[]).map(async (p) => {
        const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("plan", p);
        counts[p] = count ?? 0;
      }),
    ]);
    payments = (pay.data ?? []) as Payment[];
    for (const r of (live.data ?? []) as { plan: string; billing_interval: Interval | null }[]) {
      if (!isTier(r.plan) || !r.billing_interval) continue;
      const t = (subs[r.plan] ??= {});
      t[r.billing_interval] = (t[r.billing_interval] ?? 0) + 1;
    }
  }

  const byMonth = new Map(months.map((m) => [m.key, 0]));
  for (const p of payments) {
    const d = new Date(p.paid_at);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (byMonth.has(k)) byMonth.set(k, byMonth.get(k)! + p.amount_cents);
  }
  const thisMonth = payments.filter((p) => new Date(p.paid_at) >= months[11].start);
  const revenue = thisMonth.reduce((s, p) => s + p.amount_cents, 0);
  const peak = Math.max(1, ...byMonth.values());
  const subCount = (t: Tier) => (subs[t]?.month ?? 0) + (subs[t]?.year ?? 0);
  const totalSubs = TIERS.reduce((n, t) => n + subCount(t), 0);
  const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

  return (
    <DashPage>
      <DashHeader lead="Revenus" hl="du mois" sub={hasStripe ? undefined : "Stripe n'est pas encore configuré sur ce déploiement : aucun paiement ne peut arriver."} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Chiffre d'affaires du mois", eur(revenue)],
          ["MRR", eur(mrrCents(subs))],
          ["Abonnés actifs", `${totalSubs}`],
          ["Paiement moyen (mois)", eur(thisMonth.length ? Math.round(revenue / thisMonth.length) : 0)],
        ].map(([label, v]) => (
          <Tile key={label}>
            <TileLabel>{label}</TileLabel>
            <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{v}</p>
          </Tile>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Tile>
          <TileLabel>Historique mensuel</TileLabel>
          <div className="mt-6 grid h-40 grid-cols-12 items-end gap-2">
            {months.map((m) => {
              const v = byMonth.get(m.key) ?? 0;
              return (
                <div key={m.key} className="flex h-full flex-col justify-end gap-2 text-center" title={`${m.label} : ${eur(v)}`}>
                  <div className="rounded-sm bg-white/80" style={{ height: v ? `${Math.max(2, (v / peak) * 100)}%` : "1px", opacity: v ? 1 : 0.3 }} />
                  <span className="font-mono text-[10px] text-muted">{m.label}</span>
                </div>
              );
            })}
          </div>
          <p className="sr-only">{months.map((m) => `${m.label} ${eur(byMonth.get(m.key) ?? 0)}`).join(", ")}</p>
        </Tile>
        <Tile>
          <TileLabel>Comptes par formule</TileLabel>
          <dl className="mt-4 divide-y divide-line text-sm">
            {(["extra", "paid", "basic", "partner", "beta", "free"] as PlanId[]).map((p) => (
              <div key={p} className="flex justify-between py-2.5">
                <dt className="text-muted">{PLANS[p].name}</dt>
                <dd className="font-mono tabular-nums">{counts[p] ?? 0}</dd>
              </div>
            ))}
            {TIERS.map((t) => (
              <div key={t} className="flex justify-between py-2.5">
                <dt className="text-muted">{`Abonnés ${CATALOG[t].name} (mois / an)`}</dt>
                <dd className="font-mono tabular-nums">
                  {subs[t]?.month ?? 0} / {subs[t]?.year ?? 0}
                </dd>
              </div>
            ))}
          </dl>
        </Tile>
      </div>
      <Tile className="mt-4">
        <TileLabel right={<a href="https://dashboard.stripe.com/payments" target="_blank" rel="noreferrer" className="text-xs text-muted underline underline-offset-4 hover:text-foreground">Stripe ↗</a>}>Derniers paiements</TileLabel>
        {!payments.length ? (
          <p className="mt-4 text-sm text-muted">Aucun paiement pour l&apos;instant.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {payments.slice(0, 10).map((p) => (
              <li key={p.invoice_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5 text-sm">
                <span className="font-mono text-xs text-muted">{day(p.paid_at)}</span>
                <span className="font-mono tabular-nums">{eur(p.amount_cents)}</span>
                <span className="font-mono text-xs uppercase text-muted">{p.interval === "year" ? "annuel" : p.interval === "month" ? "mensuel" : "?"}</span>
                {p.user_id ? (
                  <Link href={`/admin/comptes/${p.user_id}`} className="text-muted underline-offset-4 hover:text-foreground hover:underline">
                    Voir le compte
                  </Link>
                ) : (
                  <span className="text-muted">compte supprimé</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Tile>
    </DashPage>
  );
}
