"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { activateCode } from "@/lib/encoder/activation";

export type ActivationState = { error?: string; until?: string; months?: number };

/** Active l'Encodeur sur le compte connecté avec le code fourni avec le boîtier : mois d'abonnement Extra offerts. */
export async function activateEncoderAction(raw: string): Promise<ActivationState> {
  const user = await requireUser("/dashboard/appareils");
  const r = await activateCode(user.id, String(raw ?? ""));
  if (!r.ok) return { error: r.error };
  revalidatePath("/dashboard", "layout");
  return { until: r.until, months: r.months };
}
