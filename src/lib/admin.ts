import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth/dal";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cleanPermissions, isRole, PERMISSION_KEYS, type AnyRole, type Permission } from "@/lib/staff";

// Équipe : trois sources, vérifiées côté serveur dans chaque page, chaque action et chaque route /admin. Un compte normal reçoit une 404.
//  1. Propriétaire : OWNER_EMAIL (Vercel), sinon la première adresse de ADMIN_EMAILS. Toutes les permissions, gère l'équipe.
//  2. Administrateurs : les adresses de ADMIN_EMAILS (jamais écrites dans le code). Toutes les permissions sauf la gestion de l'équipe.
//  3. Membres invités : table staff_members (0047_staff.sql), rôle et permissions modifiables par le propriétaire.
// Double authentification obligatoire pour tous : session vérifiée par un code TOTP (niveau aal2), sinon /admin/2fa.

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
const admins = () => list(process.env.ADMIN_EMAILS);

export function isAdminEmail(email: string | null | undefined) {
  return !!email && admins().includes(email.toLowerCase());
}

/** Propriétaire : OWNER_EMAIL, sinon la première adresse de ADMIN_EMAILS. */
export function isOwnerEmail(email: string | null | undefined) {
  if (!email) return false;
  const owner = list(process.env.OWNER_EMAIL)[0] ?? admins()[0];
  return !!owner && owner === email.toLowerCase();
}

export type StaffAccess = { role: AnyRole; owner: boolean; permissions: ReadonlySet<Permission> };
const ALL: ReadonlySet<Permission> = new Set(PERMISSION_KEYS);

/** Rôle et permissions d'un compte, ou null s'il n'est pas dans l'équipe (e-mail non vérifié, membre désactivé). */
export async function staffAccessOf(user: Pick<User, "id" | "email" | "email_confirmed_at">): Promise<StaffAccess | null> {
  if (!user.email_confirmed_at) return null;
  if (isOwnerEmail(user.email)) return { role: "owner", owner: true, permissions: ALL };
  if (isAdminEmail(user.email)) return { role: "admin", owner: false, permissions: ALL };
  if (!hasAdmin) return null;
  const { data } = await createAdminClient().from("staff_members").select("role, permissions, active").eq("user_id", user.id).maybeSingle();
  if (!data || !data.active || !isRole(data.role)) return null;
  return { role: data.role, owner: false, permissions: new Set(cleanPermissions(data.permissions)) };
}

const currentAccess = cache(async () => {
  const user = await getUser();
  return user ? { user, access: await staffAccessOf(user) } : null;
});

/** Membre de l'équipe identifié (e-mail vérifié), sans exiger le TOTP : seulement pour /admin/2fa. 404 sinon. */
export async function requireAdminIdentity() {
  const me = await currentAccess();
  if (!me?.access) notFound();
  return me.user;
}

/** Niveau de la session : « aal2 » = code TOTP vérifié. */
export async function adminAal() {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return { current: data?.currentLevel ?? "aal1", next: data?.nextLevel ?? "aal1" };
}

/** Droit demandé : une permission, « team » (gestion de l'équipe : propriétaire), « any » (tout membre) ou rien (accès complet : propriétaire et administrateurs). */
export type Need = Permission | "team" | "any" | undefined;
const allows = (a: StaffAccess, need: Need) => (need === "any" ? true : need === "team" ? a.owner : need ? a.permissions.has(need) : a.role === "owner" || a.role === "admin");

/** Accès de l'appelant à l'espace admin : 404 pour tout autre visiteur, /admin/2fa tant que le TOTP n'est pas vérifié, 404 sans le droit demandé. */
export async function requireStaff(need?: Need) {
  const me = await currentAccess();
  if (!me?.access) notFound();
  if ((await adminAal()).current !== "aal2") redirect("/admin/2fa");
  if (!allows(me.access, need)) notFound();
  return { user: me.user, access: me.access };
}

/** Page, action ou route réservée à l'équipe (voir `Need`). Renvoie l'utilisateur. */
export async function requireAdmin(need?: Need) {
  return (await requireStaff(need)).user;
}

/** Route d'API admin : même contrôle, mais réponse HTTP (404) au lieu d'une redirection. */
export async function adminOrNull(need?: Need) {
  const me = await currentAccess();
  if (!me?.access || !allows(me.access, need)) return null;
  return (await adminAal()).current === "aal2" ? me.user : null;
}

/** Accès de la session courante, sans exiger le TOTP (affichage du menu, de l'étiquette de rôle). */
export async function currentStaff() {
  return currentAccess();
}
