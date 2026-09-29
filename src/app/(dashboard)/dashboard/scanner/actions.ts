"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { hasCore, reclassifyCoverage } from "@/lib/core";
import { createClient } from "@/lib/supabase/server";

// Scanner réseau : opérateur mobile déclaré (iPhone : le navigateur ne dit pas s'il est en Wi-Fi ou en 4G/5G).
// Mémorisé sur le compte ; le Core le compare à l'ASN de chaque mesure et reclasse les mesures récentes.

const operator = z.enum(["orange", "sfr", "digicel", "free", "other"]);

export async function setMobileOperator(value: string): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireUser("/dashboard/scanner");
  const parsed = operator.safeParse(value);
  if (!parsed.success) return { error: "Opérateur inconnu." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ mobile_operator: parsed.data }).eq("id", user.id);
  if (error) {
    console.error("setMobileOperator", error.message);
    return { error: "Enregistrement impossible. Réessaie dans un instant." };
  }
  if (hasCore) await reclassifyCoverage(user.id).catch((e) => console.error("reclassifyCoverage", e));
  return { ok: true };
}
