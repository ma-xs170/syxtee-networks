import "server-only";
import { randomInt } from "node:crypto";
import { cache } from "react";
import { accountExpiring } from "@/emails/templates";
import { deleteAllRelays, deleteCoverage, hasCore } from "@/lib/core";
import { sendEmail } from "@/lib/email/send";
import { audit } from "@/lib/plan-admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Comptes gérés (créés par l'équipe) : identifiant + mot de passe temporaire, expiration facultative, première connexion obligatoire.
// Les secrets ne sont jamais stockés en clair : le mot de passe temporaire n'existe qu'au moment où l'équipe le copie.

/** Domaine technique : l'identifiant « marie.d » se connecte avec marie.d@comptes.syxtee-networks.fr (aucune boîte derrière). */
export const MANAGED_DOMAIN = "comptes.syxtee-networks.fr";
export const loginToEmail = (login: string) => `${login.toLowerCase()}@${MANAGED_DOMAIN}`;
export const isManagedEmail = (email: string | null | undefined) => !!email && email.toLowerCase().endsWith(`@${MANAGED_DOMAIN}`);
export const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export type Managed = { user_id: string; login: string; created_at: string; expires_at: string | null; must_change_password: boolean; email_required: boolean; warned_at: string | null; note: string | null };

const COLS = "user_id, login, created_at, expires_at, must_change_password, email_required, warned_at, note";

/** Fiche « compte géré » de l'utilisateur (null : compte ordinaire). Une fois par requête. */
export const managedOf = cache(async (userId: string): Promise<Managed | null> => {
  if (!hasAdmin) return null;
  const { data } = await createAdminClient().from("managed_accounts").select(COLS).eq("user_id", userId).maybeSingle();
  return (data as Managed | null) ?? null;
});

/** Mot de passe temporaire lisible à la dictée : 3 blocs de 4, sans caractères ambigus (0/O, 1/l/I), avec chiffres et symbole. */
export function generatePassword() {
  const L = "abcdefghjkmnpqrstuvwxyz";
  const U = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const D = "23456789";
  const pick = (s: string) => s[randomInt(s.length)];
  const block = (n: number) => Array.from({ length: n }, () => pick(L + U + D)).join("");
  const parts = [block(4), block(4), block(4)];
  // Garantit minuscule, majuscule, chiffre.
  parts[0] = pick(U) + pick(L) + pick(D) + pick(L + U);
  return parts.join("-");
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

/** Identifiant libre : « prenom.nom », sinon avec un numéro. */
export async function freeLogin(first: string, last: string, wanted?: string) {
  const db = createAdminClient();
  const base = (wanted ? slug(wanted) : slug(`${first}.${last}`)).slice(0, 24) || "compte";
  for (let i = 0; i < 20; i++) {
    const cand = i === 0 && base.length >= 3 ? base : `${base.length >= 3 ? base : "compte"}${randomInt(10, 99)}`;
    if (!LOGIN_RE.test(cand)) continue;
    const { data } = await db.from("managed_accounts").select("user_id").eq("login", cand).maybeSingle();
    if (!data) return cand;
  }
  throw new Error("Identifiant introuvable.");
}

export type CreateManaged = { firstName: string; lastName: string; login?: string; plan: string; planUntil: Date | null; expiresAt: Date | null; note: string | null };
export type Credentials = { userId: string; login: string; password: string };

/** Crée le compte (e-mail technique, déjà confirmé), sa fiche, sa formule. Renvoie les identifiants à copier : à montrer une seule fois. */
export async function createManaged(actor: { id: string; email: string }, o: CreateManaged): Promise<Credentials> {
  const db = createAdminClient();
  const login = await freeLogin(o.firstName, o.lastName, o.login);
  const password = generatePassword();
  const { data, error } = await db.auth.admin.createUser({
    email: loginToEmail(login),
    password,
    email_confirm: true,
    user_metadata: { first_name: o.firstName, last_name: o.lastName, managed: true },
  });
  if (error || !data.user) throw new Error(error?.message ?? "création impossible");
  const userId = data.user.id;
  const { error: pe } = await db.from("profiles").update({ first_name: o.firstName, last_name: o.lastName, plan: o.plan, plan_until: o.planUntil?.toISOString() ?? null, plan_note: o.note }).eq("id", userId);
  if (pe) console.error("createManaged profil", pe.message);
  const { error: me } = await db.from("managed_accounts").insert({ user_id: userId, login, created_by: actor.id, expires_at: o.expiresAt?.toISOString() ?? null, note: o.note });
  if (me) {
    await db.auth.admin.deleteUser(userId);
    throw new Error(`fiche : ${me.message}`);
  }
  await audit(actor.email, "managed.create", userId, null, { login, plan: o.plan, expires_at: o.expiresAt?.toISOString() ?? null });
  return { userId, login, password };
}

/** Nouveau mot de passe temporaire : la personne devra le changer à la prochaine connexion. */
export async function regeneratePassword(actor: string, userId: string): Promise<Credentials | null> {
  const db = createAdminClient();
  const m = await db.from("managed_accounts").select("login").eq("user_id", userId).maybeSingle();
  if (!m.data) return null;
  const password = generatePassword();
  const { error } = await db.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);
  await db.from("managed_accounts").update({ must_change_password: true }).eq("user_id", userId);
  await db.auth.admin.signOut(userId, "global").catch(() => {});
  await audit(actor, "managed.password", userId, null, null);
  return { userId, login: m.data.login as string, password };
}

/** Suppression complète d'un compte : relais et couverture du Core, avatars, puis le compte. */
export async function deleteAccountFully(userId: string): Promise<boolean> {
  const db = createAdminClient();
  if (hasCore) {
    try {
      await deleteAllRelays(userId);
      await deleteCoverage(userId);
    } catch (e) {
      console.error("deleteAccountFully : Core", e);
    }
  }
  const { data: files } = await db.storage.from("avatars").list(userId);
  if (files?.length) await db.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
  const { error } = await db.auth.admin.deleteUser(userId);
  return !error;
}

const WARN_DAYS = 3;

/** Tâche quotidienne : prévient (e-mail) les comptes qui expirent dans 3 jours, supprime ceux qui ont expiré. */
export async function runManagedExpiry(now = new Date()) {
  const db = createAdminClient();
  let deleted = 0;
  let warned = 0;
  const { data: gone } = await db.from("managed_accounts").select("user_id, login").not("expires_at", "is", null).lte("expires_at", now.toISOString()).limit(200);
  for (const m of gone ?? []) {
    if (await deleteAccountFully(m.user_id as string)) {
      deleted++;
      await audit("système", "managed.expire", m.user_id as string, { login: m.login }, null);
    }
  }
  const soon = new Date(now.getTime() + WARN_DAYS * 86_400_000).toISOString();
  const { data: near } = await db.from("managed_accounts").select("user_id, expires_at").not("expires_at", "is", null).is("warned_at", null).lte("expires_at", soon).gt("expires_at", now.toISOString()).limit(200);
  for (const m of near ?? []) {
    const { data } = await db.auth.admin.getUserById(m.user_id as string);
    const email = data.user?.email;
    if (email && !isManagedEmail(email)) {
      if (await sendEmail(email, accountExpiring({ until: new Date(m.expires_at as string) }))) {
        await db.from("managed_accounts").update({ warned_at: now.toISOString() }).eq("user_id", m.user_id as string);
        warned++;
      }
    }
  }
  return { managed_deleted: deleted, managed_warned: warned };
}
