import "server-only";
import { cache } from "react";
import { isAdminEmail } from "@/lib/admin";
import { can, effectivePlan, PLANS, type Feature, type Plan } from "@/lib/plans";
import { getProfile, getUser } from "./dal";

// Formule du compte connecté, vérifiée côté serveur (pages, actions, API). L'admin (ADMIN_EMAILS) a tout.

export const getPlan = cache(async (): Promise<Plan> => {
  const user = await getUser();
  if (!user) return PLANS.free;
  if (user.email_confirmed_at && isAdminEmail(user.email)) return PLANS.admin;
  const profile = await getProfile();
  if (profile?.suspended_at) return PLANS.free;
  return effectivePlan(profile);
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
