import "server-only";
import { planChanged } from "@/emails/templates";
import { hasCore, refreshCore } from "@/lib/core";
import { sendEmail } from "@/lib/email/send";
import { ASSIGNABLE, type PlanId } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

// Changement de formule (admin, tâche quotidienne, et plus tard Stripe). Toujours via ces fonctions :
// mise à jour de profiles, entrée au journal d'audit, email au client.

type PlanFields = { plan: string; plan_until: string | null; plan_note: string | null };

/** Journal d'audit (ajout seul). `actor` : email de l'admin, ou « système » / « stripe ». */
export async function audit(actor: string, action: string, target: string | null, before: unknown, after: unknown) {
  const { error } = await createAdminClient().from("admin_audit").insert({ admin_email: actor, action, target_user: target, before, after });
  if (error) console.error("admin_audit", error.message);
}

async function emailOf(userId: string) {
  const { data } = await createAdminClient().auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/** Attribue une formule (échéance et note facultatives). Renvoie false si le compte n'existe pas. */
export async function setPlan(actor: string, userId: string, next: { plan: PlanId; until: Date | null; note: string | null }, opts: { notify?: boolean; action?: string } = {}) {
  if (!ASSIGNABLE.includes(next.plan)) throw new Error(`formule non attribuable : ${next.plan}`);
  const db = createAdminClient();
  const { data: before } = await db.from("profiles").select("plan, plan_until, plan_note").eq("id", userId).maybeSingle<PlanFields>();
  if (!before) return false;
  const after: PlanFields = { plan: next.plan, plan_until: next.until?.toISOString() ?? null, plan_note: next.note };
  const { error } = await db.from("profiles").update({ ...after, plan_reminded_at: null }).eq("id", userId);
  if (error) throw new Error(`profiles : ${error.message}`);
  await audit(actor, opts.action ?? "plan.set", userId, before, after);
  if (hasCore) await refreshCore().catch((e) => console.error("refreshCore", e));
  if (opts.notify !== false && next.plan !== before.plan) {
    const email = await emailOf(userId);
    if (email) await sendEmail(email, planChanged({ plan: next.plan, until: next.until }));
  }
  return true;
}

/** « Offrir X jours de Payant » : prolonge une formule Payant en cours, sinon part d'aujourd'hui. */
export async function offerPaidDays(actor: string, userId: string, days: number) {
  const { data } = await createAdminClient().from("profiles").select("plan, plan_until, plan_note").eq("id", userId).maybeSingle<PlanFields>();
  if (!data) return false;
  const current = data.plan === "paid" && data.plan_until ? Date.parse(data.plan_until) : 0;
  const from = Math.max(Date.now(), current);
  return setPlan(actor, userId, { plan: "paid", until: new Date(from + days * 86_400_000), note: data.plan_note }, { action: `plan.offer_${days}d` });
}

/**
 * Tâche quotidienne : formules échues → Gratuit (email), et rappel « fin dans 7 jours » une seule fois par échéance.
 * Admin et Bêta sans date ne sont jamais concernés.
 */
export async function runPlanExpiry(now = new Date()) {
  const db = createAdminClient();
  const { data: expired } = await db.from("profiles").select("id, plan, plan_until").neq("plan", "free").neq("plan", "admin").not("plan_until", "is", null).lte("plan_until", now.toISOString()).limit(500);
  for (const p of expired ?? []) await setPlan("système", p.id as string, { plan: "free", until: null, note: null }, { action: "plan.expire" });

  const in7 = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  const { data: soon } = await db
    .from("profiles")
    .select("id, plan, plan_until")
    .neq("plan", "free")
    .neq("plan", "admin")
    .is("plan_reminded_at", null)
    .gt("plan_until", now.toISOString())
    .lte("plan_until", in7)
    .limit(500);
  for (const p of soon ?? []) {
    const email = await emailOf(p.id as string);
    if (email) await sendEmail(email, planChanged({ plan: p.plan as string, until: new Date(p.plan_until as string), expiring: true }));
    await db.from("profiles").update({ plan_reminded_at: now.toISOString() }).eq("id", p.id);
  }
  return { expired: expired?.length ?? 0, reminded: soon?.length ?? 0 };
}

/**
 * Point d'accroche Stripe (pas encore branché) : paiement réussi → Payant jusqu'à la fin de la période ;
 * résiliation → Gratuit à la fin de la période (via plan_until, la tâche quotidienne fait la bascule).
 */
export async function applyBillingEvent(e: { userId: string; kind: "paid" | "canceled"; periodEnd: Date }) {
  if (e.kind === "paid") return setPlan("stripe", e.userId, { plan: "paid", until: e.periodEnd, note: null }, { action: "billing.paid" });
  const { data } = await createAdminClient().from("profiles").select("plan_note").eq("id", e.userId).maybeSingle<{ plan_note: string | null }>();
  return setPlan("stripe", e.userId, { plan: "paid", until: e.periodEnd, note: data?.plan_note ?? null }, { action: "billing.canceled", notify: false });
}
