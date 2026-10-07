import "server-only";
import { cache } from "react";
import { isAdminEmail } from "@/lib/admin";
import { can, effectivePlan, PLANS, type Feature, type Plan } from "@/lib/plans";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { getActiveWorkspace } from "@/lib/workspace";
import { getProfile, getUser } from "./dal";

// Formule du compte connecté, vérifiée côté serveur (pages, actions, API). L'admin (ADMIN_EMAILS) a tout.

/** Formule du compte connecté lui-même, jamais celle d'un espace. */
export const getPersonalPlan = cache(async (): Promise<Plan> => {
  const user = await getUser();
  if (!user) return PLANS.free;
  if (user.email_confirmed_at && isAdminEmail(user.email)) return PLANS.admin;
  const profile = await getProfile();
  if (profile?.suspended_at) return PLANS.free;
  return effectivePlan(profile);
});

/** Formule de ce que l'on regarde : celle de l'espace partagé actif (copie de celle de son créateur), sinon la sienne. */
export const getPlan = cache(async (): Promise<Plan> => {
  const ws = await getActiveWorkspace();
  if (!ws || !hasAdmin) return getPersonalPlan();
  const { data } = await createAdminClient().from("profiles").select("plan, plan_until, suspended_at").eq("id", ws.id).maybeSingle();
  if (!data || data.suspended_at) return PLANS.free;
  return effectivePlan(data);
});

/** Vrai si le compte connecté a accès à la fonction. */
export async function hasFeature(feature: Feature) {
  return can(await getPlan(), feature);
}

export class FeatureLockedError extends Error {
  constructor(public feature: Feature) {
    super(`feature_locked:${feature}`);
  }
}

/** Action serveur réservée aux abonnés : lève FeatureLockedError pour un compte gratuit (même en appel direct). */
export async function requireFeature(feature: Feature) {
  const plan = await getPlan();
  if (!can(plan, feature)) throw new FeatureLockedError(feature);
  return plan;
}

export const LOCKED_MESSAGE = "Fonction réservée aux abonnés. Passe à la formule payante pour la débloquer.";
