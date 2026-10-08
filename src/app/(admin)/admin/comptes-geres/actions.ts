"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { personName } from "@/lib/auth/profileSchema";
import { createManaged, deleteAccountFully, regeneratePassword, type Credentials } from "@/lib/managed";
import { audit } from "@/lib/plan-admin";
import { ASSIGNABLE, type PlanId } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

// Comptes gérés : l'équipe (permission « Comptes clients ») crée des comptes avec identifiant et mot de passe temporaires, durée
// indéfinie ou éphémère. Chaque action est journalisée ; le mot de passe n'est montré qu'une fois, au moment de la création ou du renouvellement.

export type ManagedState = { ok?: string; error?: string; creds?: Credentials };

const days = z.union([z.literal("none"), z.coerce.number().int().min(1).max(365)]);

const createInput = z.object({
  firstName: personName("Prénom"),
  lastName: personName("Nom"),
  login: z.string().trim().toLowerCase().max(30).regex(/^([a-z0-9][a-z0-9._-]{2,29})?$/, "Identifiant : 3 à 30 caractères (lettres, chiffres, point, tiret).").optional(),
  plan: z.enum(ASSIGNABLE as [PlanId, ...PlanId[]]),
  lifetime: days,
  note: z.string().trim().max(200).transform((v) => v || null),
});

export async function createManagedAction(_prev: ManagedState, form: FormData): Promise<ManagedState> {
  const admin = await requireAdmin("accounts");
  const p = createInput.safeParse({
    firstName: form.get("firstName"),
    lastName: form.get("lastName"),
    login: String(form.get("login") ?? ""),
    plan: form.get("plan"),
    lifetime: form.get("lifetime"),
    note: form.get("note") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Formulaire invalide." };
  const expiresAt = p.data.lifetime === "none" ? null : new Date(Date.now() + p.data.lifetime * 86_400_000);
  try {
    const creds = await createManaged({ id: admin.id, email: admin.email! }, { firstName: p.data.firstName, lastName: p.data.lastName, login: p.data.login || undefined, plan: p.data.plan, planUntil: null, expiresAt, note: p.data.note });
    revalidatePath("/admin/comptes-geres");
    return { ok: "Compte créé. Copie les identifiants maintenant : le mot de passe ne sera plus affiché.", creds };
  } catch (e) {
    console.error("createManagedAction", e);
    return { error: "Création impossible. Réessaie." };
  }
}

export async function regenerateAction(userId: string, _prev: ManagedState): Promise<ManagedState> {
  const admin = await requireAdmin("accounts");
  if (!z.uuid().safeParse(userId).success) return { error: "Requête invalide." };
  try {
    const creds = await regeneratePassword(admin.email!, userId);
    if (!creds) return { error: "Compte introuvable." };
    revalidatePath("/admin/comptes-geres");
    return { ok: "Nouveau mot de passe créé. La personne devra le changer à sa connexion.", creds };
  } catch (e) {
    console.error("regenerateAction", e);
    return { error: "Impossible de changer le mot de passe." };
  }
}

/** Durée du compte : indéfinie, ou N jours à partir d'aujourd'hui. Remet le rappel à zéro. */
export async function setLifetimeAction(userId: string, _prev: ManagedState, form: FormData): Promise<ManagedState> {
  const admin = await requireAdmin("accounts");
  const d = days.safeParse(form.get("lifetime"));
  if (!d.success || !z.uuid().safeParse(userId).success) return { error: "Durée invalide." };
  const expires = d.data === "none" ? null : new Date(Date.now() + d.data * 86_400_000).toISOString();
  const { error } = await createAdminClient().from("managed_accounts").update({ expires_at: expires, warned_at: null }).eq("user_id", userId);
  if (error) return { error: "Enregistrement impossible." };
  await audit(admin.email!, "managed.lifetime", userId, null, { expires_at: expires });
  revalidatePath("/admin/comptes-geres");
  return { ok: expires ? "Durée mise à jour." : "Compte sans date de fin." };
}

export async function deleteManagedAction(userId: string, _prev: ManagedState): Promise<ManagedState> {
  const admin = await requireAdmin("accounts");
  if (!z.uuid().safeParse(userId).success) return { error: "Requête invalide." };
  const db = createAdminClient();
  const { data: m } = await db.from("managed_accounts").select("login").eq("user_id", userId).maybeSingle();
  if (!m) return { error: "Compte introuvable." };
  if (!(await deleteAccountFully(userId))) return { error: "Suppression impossible." };
  await audit(admin.email!, "managed.delete", userId, { login: m.login }, null);
  revalidatePath("/admin/comptes-geres");
  return { ok: "Compte supprimé." };
}
