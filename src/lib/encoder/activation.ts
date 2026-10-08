import "server-only";
import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Activation de l'Encodeur : un code à usage unique offre des mois de la formule Extra (la plus élevée) au compte qui l'active.
// Le code ne peut jamais servir sur un autre compte : s'il est réservé à un acheteur, seul ce compte l'active ; une fois utilisé, il est consommé.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0, O, 1, I

export const normalizeCode = (raw: string) => {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return c.length === 12 ? `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}` : "";
};

export function generateCode() {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${part()}-${part()}-${part()}`;
}

/** Crée des codes (équipe ou paiement). `buyerId` : réserve les codes à un compte. */
export async function createCodes(n: number, opts: { months?: number; orderRef?: string; buyerId?: string; createdBy?: string } = {}) {
  const db = createAdminClient();
  const rows = Array.from({ length: n }, () => ({ code: generateCode(), months: opts.months ?? 4, order_ref: opts.orderRef ?? null, buyer_id: opts.buyerId ?? null, created_by: opts.createdBy ?? null }));
  const { error } = await db.from("encoder_activation_codes").insert(rows);
  if (error) throw new Error(`encoder_activation_codes : ${error.message}`);
  return rows.map((r) => r.code);
}

export type ActivationResult = { ok: true; until: string; months: number } | { ok: false; error: string };

/** Active un code sur un compte : consomme le code (une seule fois) puis débloque Extra pour `months` mois (prolonge si déjà en cours). */
export async function activateCode(userId: string, raw: string): Promise<ActivationResult> {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, error: "Code invalide. Il se présente sous la forme XXXX-XXXX-XXXX." };
  const db = createAdminClient();

  const { data: profile } = await db.from("profiles").select("plan, plan_until, suspended_at").eq("id", userId).maybeSingle<{ plan: string | null; plan_until: string | null; suspended_at: string | null }>();
  if (!profile) return { ok: false, error: "Profil introuvable." };
  if (profile.suspended_at) return { ok: false, error: "Ce compte est suspendu." };
  // Formules attribuées à la main : déjà illimitées, on ne consomme pas le code.
  if (["partner", "beta", "admin"].includes(profile.plan ?? "")) return { ok: false, error: "Ton compte a déjà un accès complet : ce code reste valable pour un autre compte de ton choix." };

  const { data: row } = await db.from("encoder_activation_codes").select("code, months, buyer_id, used_by").eq("code", code).maybeSingle<{ code: string; months: number; buyer_id: string | null; used_by: string | null }>();
  if (!row || row.used_by) return { ok: false, error: "Code invalide ou déjà utilisé." };
  if (row.buyer_id && row.buyer_id !== userId) return { ok: false, error: "Ce code est réservé à un autre compte." };

  // Consommation atomique : seul le premier à poser used_by gagne (double envoi, deux comptes en même temps).
  const { data: claimed, error } = await db.from("encoder_activation_codes").update({ used_by: userId, used_at: new Date().toISOString() }).eq("code", code).is("used_by", null).select("months").maybeSingle<{ months: number }>();
  if (error || !claimed) return { ok: false, error: "Code invalide ou déjà utilisé." };

  const now = Date.now();
  const current = profile.plan === "extra" && profile.plan_until && Date.parse(profile.plan_until) > now ? Date.parse(profile.plan_until) : now;
  const until = new Date(current);
  until.setMonth(until.getMonth() + claimed.months);
  const { error: grantError } = await db.from("profiles").update({ plan: "extra", plan_until: until.toISOString() }).eq("id", userId);
  if (grantError) {
    // Le déblocage a échoué : on libère le code pour que la personne puisse réessayer.
    await db.from("encoder_activation_codes").update({ used_by: null, used_at: null }).eq("code", code);
    return { ok: false, error: "Activation impossible pour le moment. Réessaie." };
  }
  return { ok: true, until: until.toISOString(), months: claimed.months };
}
