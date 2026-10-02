"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { CoreRefusal, deleteAllRelays, deleteCoverage, hasCore, listRelays, refreshCore, rotateRelay, updateRelay } from "@/lib/core";
import { audit, offerPaidDays, setPlan } from "@/lib/plan-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASSIGNABLE, type PlanId } from "@/lib/plans";

// Fiche compte (admin) : formule, identité, clés, suspension, suppression, notes. Chaque action va au journal d'audit.

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

// ───────────── Fiche compte : identité, clés, suspension, suppression, notes ─────────────

const uid = z.uuid();
const nameField = (label: string) => z.string().trim().min(1, `${label} obligatoire.`).max(50, `${label} : 50 caractères au plus.`);

function done(userId: string) {
  revalidatePath(`/admin/comptes/${userId}`);
  revalidatePath("/admin/comptes");
}

/** Prénom, nom, email (l'email est changé directement, sans lien de confirmation : action admin tracée). */
export async function updateIdentityAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ userId: uid, first_name: nameField("Prénom"), last_name: nameField("Nom"), email: z.string().trim().toLowerCase().pipe(z.email("Email invalide.")) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { userId, first_name, last_name, email } = parsed.data;
  const db = createAdminClient();
  const [{ data: before }, { data: u }] = await Promise.all([
    db.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle(),
    db.auth.admin.getUserById(userId),
  ]);
  if (!before || !u.user) return { error: "Compte introuvable." };
  if (email !== u.user.email) {
    const { error } = await db.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) return { error: error.code === "email_exists" ? "Cet email est déjà utilisé par un autre compte." : "Changement d'email impossible." };
  }
  const { error } = await db.from("profiles").update({ first_name, last_name }).eq("id", userId);
  if (error) return { error: "Enregistrement impossible." };
  await audit(admin.email!, "account.identity", userId, { ...before, email: u.user.email }, { first_name, last_name, email });
  done(userId);
  return { ok: "Identité enregistrée." };
}

/** Clés : « regenerate » = nouvelle clé pour chaque relais (coupe les flux) ; « revoke » = archive tous les relais. */
export async function keysAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin();
  const userId = uid.safeParse(form.get("userId"));
  const mode = form.get("mode");
  if (!userId.success || (mode !== "regenerate" && mode !== "revoke")) return { error: "Requête invalide." };
  if (!hasCore) return { error: "Core non configuré." };
  try {
    const relays = (await listRelays(userId.data)).filter((r) => !r.archived);
    for (const r of relays) {
      if (mode === "regenerate") await rotateRelay(userId.data, r.id);
      else await updateRelay(userId.data, r.id, { archived: true });
    }
    await audit(admin.email!, mode === "regenerate" ? "keys.regenerate" : "keys.revoke", userId.data, null, { relays: relays.map((r) => r.id) });
    done(userId.data);
    return { ok: mode === "regenerate" ? `${relays.length} clé(s) régénérée(s).` : `${relays.length} relais archivé(s).` };
  } catch (e) {
    console.error("keysAction", e);
    return { error: e instanceof CoreRefusal ? `Refusé par le relais : ${e.code}` : "Le relais ne répond pas." };
  }
}

/** « Couper le flux » d'un relais (abus) : nouvelle clé, le publieur est coupé dans la seconde. */
export async function cutRelayAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin();
  const p = z.object({ userId: uid, relayId: uid }).safeParse({ userId: form.get("userId"), relayId: form.get("relayId") });
  if (!p.success) return { error: "Requête invalide." };
  try {
    await rotateRelay(p.data.userId, p.data.relayId);
  } catch (e) {
    console.error("cutRelayAction", e);
    return { error: "Le relais ne répond pas." };
  }
  await audit(admin.email!, "relay.cut", p.data.userId, null, { relay: p.data.relayId });
  revalidatePath("/admin/relais");
  done(p.data.userId);
  return { ok: "Flux coupé : nouvelle clé générée." };
}

export async function suspendAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin();
  const userId = uid.safeParse(form.get("userId"));
  if (!userId.success) return { error: "Requête invalide." };
  const suspend = form.get("suspend") === "1";
  const db = createAdminClient();
  const { data: before } = await db.from("profiles").select("suspended_at").eq("id", userId.data).maybeSingle();
  if (!before) return { error: "Compte introuvable." };
  const suspended_at = suspend ? new Date().toISOString() : null;
  const { error } = await db.from("profiles").update({ suspended_at }).eq("id", userId.data);
  if (error) return { error: "Enregistrement impossible." };
  await audit(admin.email!, suspend ? "account.suspend" : "account.reactivate", userId.data, before, { suspended_at });
  if (hasCore) await refreshCore().catch((e) => console.error("refreshCore", e));
  done(userId.data);
  return { ok: suspend ? "Compte suspendu : ses flux sont coupés." : "Compte réactivé." };
}

/** Suppression définitive : il faut retaper l'ID support du compte. */
export async function deleteAccountAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin();
  const userId = uid.safeParse(form.get("userId"));
  if (!userId.success) return { error: "Requête invalide." };
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("support_id, first_name, last_name, plan").eq("id", userId.data).maybeSingle();
  if (!p) return { error: "Compte introuvable." };
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== p.support_id) return { error: `Tape ${p.support_id} pour confirmer.` };
  if (hasCore) {
    try {
      await deleteAllRelays(userId.data);
      await deleteCoverage(userId.data);
    } catch (e) {
      console.error("deleteAccountAction : Core", e);
    }
  }
  const { data: files } = await db.storage.from("avatars").list(userId.data);
  if (files?.length) await db.storage.from("avatars").remove(files.map((f) => `${userId.data}/${f.name}`));
  const { error } = await db.auth.admin.deleteUser(userId.data);
  if (error) return { error: "Suppression impossible." };
  await audit(admin.email!, "account.delete", userId.data, p, null);
  revalidatePath("/admin/comptes");
  redirect("/admin/comptes?supprime=1");
}

export async function addNoteAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin();
  const p = z.object({ userId: uid, body: z.string().trim().min(1, "Note vide.").max(2000) }).safeParse({ userId: form.get("userId"), body: form.get("body") });
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Note invalide." };
  const { error } = await createAdminClient().from("admin_notes").insert({ user_id: p.data.userId, author: admin.email!, body: p.data.body });
  if (error) return { error: "Enregistrement impossible." };
  await audit(admin.email!, "account.note", p.data.userId, null, { body: p.data.body });
  done(p.data.userId);
  return { ok: "Note ajoutée." };
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
  return { ok: `${parsed.data.days} jours de Premium offerts.` };
}
