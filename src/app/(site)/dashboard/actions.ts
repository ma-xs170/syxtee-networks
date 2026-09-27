"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { allow } from "@/lib/auth/rateLimit";
import { createStreamKeys, rotateStreamKeys } from "@/lib/core";

export type KeyActionState = { error?: string };

export async function createKeys(): Promise<KeyActionState> {
  const user = await requireUser("/dashboard");
  try {
    await createStreamKeys(user.id);
  } catch (e) {
    console.error("createKeys", e);
    return { error: "Le relais ne répond pas. Réessaie dans un instant." };
  }
  revalidatePath("/dashboard");
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
  revalidatePath("/dashboard");
  return {};
}
