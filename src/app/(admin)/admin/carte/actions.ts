"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { deleteCoverage, hasCore } from "@/lib/core";
import { audit } from "@/lib/plan-admin";

export type EraseState = { ok?: string; error?: string };

/** Modération de la carte : efface toutes les mesures d'un compte (Core : mesures + agrégats recalculés). */
export async function eraseMeasuresAction(_prev: EraseState, form: FormData): Promise<EraseState> {
  const admin = await requireAdmin();
  const userId = z.uuid().safeParse(form.get("userId"));
  if (!userId.success) return { error: "Requête invalide." };
  if (!hasCore) return { error: "Core non configuré." };
  try {
    const res = await deleteCoverage(userId.data);
    await audit(admin.email!, "coverage.erase", userId.data, null, { deleted: res?.deleted ?? null });
    revalidatePath("/admin/carte");
    return { ok: `${res?.deleted ?? 0} mesure(s) effacée(s).` };
  } catch (e) {
    console.error("eraseMeasuresAction", e);
    return { error: "Le relais ne répond pas." };
  }
}
