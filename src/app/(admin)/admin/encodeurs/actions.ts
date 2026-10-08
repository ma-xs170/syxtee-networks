"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createCodes } from "@/lib/encoder/activation";
import { audit } from "@/lib/plan-admin";

// Codes d'activation de l'Encodeur : l'équipe (permission « Comptes clients ») en génère par lot pour les boîtiers vendus hors boutique.
export type CodesState = { ok?: string; error?: string; codes?: string[] };

const input = z.object({ count: z.coerce.number().int().min(1).max(50), months: z.coerce.number().int().min(1).max(24), note: z.string().trim().max(120).optional() });

export async function generateCodesAction(_prev: CodesState, form: FormData): Promise<CodesState> {
  const admin = await requireAdmin("accounts");
  const p = input.safeParse({ count: form.get("count"), months: form.get("months"), note: form.get("note") ?? "" });
  if (!p.success) return { error: "Quantité (1 à 50) et durée (1 à 24 mois) attendues." };
  try {
    const codes = await createCodes(p.data.count, { months: p.data.months, orderRef: p.data.note || "équipe", createdBy: admin.id });
    await audit(admin.email ?? admin.id, "encoder_codes", null, null, { count: codes.length, months: p.data.months });
    revalidatePath("/admin/encodeurs");
    return { ok: `${codes.length} code${codes.length > 1 ? "s" : ""} créé${codes.length > 1 ? "s" : ""}.`, codes };
  } catch (e) {
    console.error("generateCodesAction", e instanceof Error ? e.message : e);
    return { error: "Création impossible. Vérifie que la migration 0049 est appliquée." };
  }
}
