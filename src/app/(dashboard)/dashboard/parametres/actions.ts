"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { allow } from "@/lib/auth/rateLimit";
import { deleteCoverage, hasCore } from "@/lib/core";
import { createClient } from "@/lib/supabase/server";

// Carte de couverture : consentement et zones privées (écrits avec la session de l'utilisateur, RLS).
// Le Core relit le consentement avant chaque écriture : décocher arrête la collecte en moins de 30 s.

export type CoverageState = { error?: string; ok?: boolean };
const PATH = "/dashboard/parametres";

export async function setCoverageConsent(consent: boolean): Promise<CoverageState> {
  const user = await requireUser(PATH);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ coverage_consent: consent }).eq("id", user.id);
  if (error) {
    console.error("setCoverageConsent", error.message);
    return { error: "Enregistrement impossible. Réessaie dans un instant." };
  }
  revalidatePath(PATH);
  return { ok: true };
}

const zone = z.object({
  label: z.string().trim().min(1, "Donne un nom à la zone.").max(40, "40 caractères au plus."),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_m: z.coerce.number().int().min(100).max(2000),
});

export async function addPrivateZone(_prev: CoverageState, form: FormData): Promise<CoverageState> {
  const user = await requireUser(PATH);
  if (!(await allow(`zone:${user.id}`, 20, 3600))) return { error: "Trop de modifications. Réessaie dans une heure." };
  const parsed = zone.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Position invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("private_zones").insert({ user_id: user.id, ...parsed.data });
  if (error) return { error: error.message.includes("private_zones_limit") ? "3 zones au plus." : "Enregistrement impossible." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function deletePrivateZone(id: string): Promise<CoverageState> {
  const user = await requireUser(PATH);
  if (!z.uuid().safeParse(id).success) return { error: "Zone inconnue." };
  const supabase = await createClient();
  const { error } = await supabase.from("private_zones").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Suppression impossible." };
  revalidatePath(PATH);
  return { ok: true };
}

/** Droit à l'effacement : supprime toutes mes mesures de couverture (et mes contributions). */
export async function eraseCoverage(): Promise<CoverageState> {
  const user = await requireUser(PATH);
  if (!hasCore) return { error: "Le relais n'est pas branché." };
  try {
    await deleteCoverage(user.id);
  } catch (e) {
    console.error("eraseCoverage", e);
    return { error: "Le relais ne répond pas. Réessaie dans un instant." };
  }
  return { ok: true };
}
