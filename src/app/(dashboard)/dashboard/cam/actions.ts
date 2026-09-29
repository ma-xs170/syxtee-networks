"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { allow } from "@/lib/auth/rateLimit";
import { rotateCam } from "@/lib/core";
import { FEATURE_CAM } from "@/lib/features";

export type CamActionState = { error?: string };

/** Nouveau lien caméra : l'ancien (et la caméra qui l'a retenu) cesse de marcher tout de suite. */
export async function rotateCamLink(): Promise<CamActionState> {
  const user = await requireUser("/dashboard/cam");
  if (!FEATURE_CAM) return { error: "SYXTEE Cam est en pause." };
  if (!(await allow(`cam-rotate:${user.id}`, 5, 3600))) return { error: "Trop de régénérations. Réessaie dans une heure." };
  try {
    await rotateCam(user.id);
  } catch (e) {
    console.error("rotateCamLink", e);
    return { error: "Le relais ne répond pas. Réessaie dans un instant." };
  }
  revalidatePath("/dashboard/cam");
  return {};
}
