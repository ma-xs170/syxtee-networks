import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Réinitialisation du mot de passe : seul un lien « mot de passe oublié » récent ouvre /reinitialiser.
// Le lien donne une session ; on pose en plus un cookie signé (compte + date de la demande), valable 1 h.
// Une session volée ne suffit donc pas à changer le mot de passe sans connaître l'ancien.

export const RECOVERY_TTL_S = 3600;
const COOKIE = "syx_recovery";

const sign = (v: string) => createHmac("sha256", process.env.SUPABASE_SECRET_KEY ?? "dev").update(v).digest("base64url");
const payload = (user: User) => `${user.id}.${user.recovery_sent_at ?? ""}`;

/** Vrai si la demande de réinitialisation de ce compte date de moins d'une heure. */
export function recoveryFresh(user: User) {
  const at = user.recovery_sent_at ? Date.parse(user.recovery_sent_at) : NaN;
  return Number.isFinite(at) && Date.now() - at < RECOVERY_TTL_S * 1000;
}

export async function grantRecovery(user: User) {
  (await cookies()).set(COOKIE, sign(payload(user)), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: RECOVERY_TTL_S });
}

export async function hasRecovery(user: User) {
  const got = (await cookies()).get(COOKIE)?.value ?? "";
  const want = sign(payload(user));
  return recoveryFresh(user) && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function clearRecovery() {
  (await cookies()).delete(COOKIE);
}
