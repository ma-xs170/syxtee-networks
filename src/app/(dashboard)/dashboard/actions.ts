"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { allow } from "@/lib/auth/rateLimit";
import { createStreamKeys, rotateStreamKeys, setStreamMode } from "@/lib/core";
import { forgetOverview } from "@/lib/dashboard-overview";

export type KeyActionState = { error?: string };

export async function createKeys(): Promise<KeyActionState> {
  const user = await requireUser("/dashboard");
  try {
    await createStreamKeys(user.id);
  } catch (e) {
    console.error("createKeys", e);
    return { error: "Le relais ne répond pas. Réessaie dans un instant." };
  }
  forgetOverview(user.id);
  revalidatePath("/dashboard", "layout");
  return {};
}

/** Nouvelle clé : l'ancienne cesse de marcher immédiatement (Moblin et OBS doivent recoller les URLs). */
export async function rotateKeys(): Promise<KeyActionState> {
  const user = await requireUser("/dashboard");
  if (!(await allow(`rotate:${user.id}`, 5, 3600))) return { error: "Trop de régénérations. Réessaie dans une heure." };
  try {
    await rotateStreamKeys(user.id);
  } catch (e) {
    console.error("rotateKeys", e);
    return { error: "Le relais ne répond pas. Réessaie dans un instant." };
  }
  forgetOverview(user.id);
  revalidatePath("/dashboard", "layout");
  return {};
}

/** Mode de sortie : Direct (OBS lit le téléphone) ou Régie (mire automatique si le téléphone coupe). */
export async function changeMode(mode: "direct" | "regie"): Promise<KeyActionState> {
  const user = await requireUser("/dashboard/mire");
  if (!(await allow(`mode:${user.id}`, 20, 3600))) return { error: "Trop de changements. Réessaie dans une heure." };
  try {
    await setStreamMode(user.id, mode);
  } catch (e) {
    console.error("changeMode", e);
    return { error: "Le relais ne répond pas, ou la régie n'est pas encore disponible." };
  }
  forgetOverview(user.id);
  revalidatePath("/dashboard", "layout");
  return {};
}
