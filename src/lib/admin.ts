import "server-only";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

// Administrateurs : emails de la variable ADMIN_EMAILS (Vercel, séparés par des virgules), jamais écrits dans le code.
// Vérifié côté serveur dans chaque page, chaque action et chaque route /admin. Un compte normal reçoit une 404.
// Double authentification obligatoire : session vérifiée par un code TOTP (niveau aal2), sinon /admin/2fa.

const admins = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export function isAdminEmail(email: string | null | undefined) {
  return !!email && admins().includes(email.toLowerCase());
}

/** Admin identifié (email vérifié + ADMIN_EMAILS), sans exiger le TOTP : seulement pour /admin/2fa. 404 sinon. */
export async function requireAdminIdentity() {
  const user = await getUser();
  if (!user || !user.email_confirmed_at || !isAdminEmail(user.email)) notFound();
  return user;
}

/** Niveau de la session : « aal2 » = code TOTP vérifié. */
export async function adminAal() {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return { current: data?.currentLevel ?? "aal1", next: data?.nextLevel ?? "aal1" };
}

/** Page, action ou route réservée à l'admin : 404 pour tout autre visiteur, /admin/2fa tant que le TOTP n'est pas vérifié. */
export async function requireAdmin() {
  const user = await requireAdminIdentity();
  if ((await adminAal()).current !== "aal2") redirect("/admin/2fa");
  return user;
}

/** Route d'API admin : même contrôle, mais réponse HTTP (404) au lieu d'une redirection. */
export async function adminOrNull() {
  const user = await getUser();
  if (!user || !user.email_confirmed_at || !isAdminEmail(user.email)) return null;
  return (await adminAal()).current === "aal2" ? user : null;
}
