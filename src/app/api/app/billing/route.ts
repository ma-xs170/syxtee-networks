import { appUser, privateJson } from "@/lib/auth/app-api";
import { getPlan } from "@/lib/auth/plan";
import { CATALOG, INTERVALS, TIERS, canSubscribe, renews } from "@/lib/billing";
import { relayLimit } from "@/lib/plans";

// GET /api/app/billing : formule actuelle, état de l'abonnement et catalogue des formules.
export async function GET() {
  const u = await appUser();
  if (u instanceof Response) return u;
  const p = u.profile;
  const plan = await getPlan();
  return privateJson({
    current: { name: plan.name, id: p.plan ?? "free", until: p.plan_until ?? null, relays: relayLimit(plan), streams: Number.isFinite(plan.maxConcurrentStreams) ? plan.maxConcurrentStreams : 99 },
    billing: { status: p.billing_status ?? null, interval: p.billing_interval ?? null, renews: renews(p), cancel_at_period_end: !!p.cancel_at_period_end, period_end: p.billing_period_end ?? null, has_customer: !!p.stripe_customer_id },
    can_subscribe: canSubscribe(p),
    tiers: TIERS.map((t) => ({ id: t, ...CATALOG[t] })),
    intervals: INTERVALS,
  });
}
