"use server";

import { redirect } from "next/navigation";
import { requireAdminIdentity } from "@/lib/admin";
import { allow } from "@/lib/auth/rateLimit";
import { audit } from "@/lib/plan-admin";
import { createClient } from "@/lib/supabase/server";

// Double authentification de l'admin (Supabase MFA, TOTP) : enrôlement une fois, puis un code à chaque session.

export type EnrollState = { factorId?: string; qr?: string; secret?: string; error?: string };
export type VerifyState = { error?: string };

/** Nouveau facteur TOTP (les enrôlements non terminés sont d'abord retirés). */
export async function enrollTotp(): Promise<EnrollState> {
  await requireAdminIdentity();
  const supabase = await createClient();
  const { data: list } = await supabase.auth.mfa.listFactors();
  for (const f of list?.all ?? []) if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "SYXTEE admin", issuer: "SYXTEE" });
  if (error || !data) {
    console.error("mfa.enroll", error?.code, error?.message);
    return { error: "Impossible de créer le code. Vérifie que le TOTP est activé dans Supabase (Authentication → MFA)." };
  }
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Vérifie le code à 6 chiffres : la session passe en aal2 (cookies mis à jour), puis retour à /admin. */
export async function verifyTotp(_prev: VerifyState, form: FormData): Promise<VerifyState> {
  const user = await requireAdminIdentity();
  const factorId = String(form.get("factorId") ?? "");
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Le code fait 6 chiffres." };
  if (!(await allow(`mfa:${user.id}`, 5, 300))) return { error: "Trop d'essais. Réessaie dans 5 minutes." };
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "Code incorrect ou expiré." };
  await audit(user.email!, "admin.mfa_verified", user.id, null, null);
  redirect("/admin");
}
