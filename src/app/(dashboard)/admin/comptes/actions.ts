"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { offerPaidDays, setPlan } from "@/lib/plan-admin";
import { ASSIGNABLE, type PlanId } from "@/lib/plans";

// Fiche compte (admin) : changer la formule, offrir des jours de Payant. Chaque action va au journal d'audit.

export type PlanState = { ok?: string; error?: string };

const planInput = z.object({
  userId: z.uuid(),
  plan: z.enum(ASSIGNABLE as [PlanId, ...PlanId[]]),
  until: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide.")
    .transform((v) => (v ? new Date(`${v}T23:59:59+02:00`) : null))
    .refine((d) => !d || d.getTime() > Date.now(), "La date d'expiration doit être dans le futur."),
  note: z
    .string()
    .trim()
    .max(200, "Note : 200 caractères au plus.")
    .transform((v) => v || null),
});

export async function setPlanAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin();
  const parsed = planInput.safeParse({ userId: form.get("userId"), plan: form.get("plan"), until: form.get("until") ?? "", note: form.get("note") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { userId, plan, until, note } = parsed.data;
  try {
    if (!(await setPlan(admin.email!, userId, { plan, until: plan === "free" ? null : until, note }))) return { error: "Compte introuvable." };
  } catch (e) {
    console.error("setPlanAction", e);
    return { error: "Enregistrement impossible." };
  }
  revalidatePath("/admin/comptes");
  revalidatePath("/admin/partenaires");
  return { ok: "Formule enregistrée. Le client a reçu un email." };
}

export async function offerDaysAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin();
  const parsed = z.object({ userId: z.uuid(), days: z.coerce.number().int().min(1).max(365) }).safeParse({ userId: form.get("userId"), days: form.get("days") });
  if (!parsed.success) return { error: "Nombre de jours invalide (1 à 365)." };
  try {
    if (!(await offerPaidDays(admin.email!, parsed.data.userId, parsed.data.days))) return { error: "Compte introuvable." };
  } catch (e) {
    console.error("offerDaysAction", e);
    return { error: "Enregistrement impossible." };
  }
  revalidatePath("/admin/comptes");
  return { ok: `${parsed.data.days} jours de Payant offerts.` };
}
