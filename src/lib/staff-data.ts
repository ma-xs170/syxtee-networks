import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { cleanPermissions, isRole, ROLE_META, ROLES, type AnyRole, type Permission, type StaffRole } from "@/lib/staff";
import { isAdminEmail, isOwnerEmail } from "@/lib/admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Équipe : lecture de la liste (propriétaire, administrateurs de l'environnement, membres invités), invitations par e-mail.
// Tout passe par la clé secrète ; l'appelant a déjà vérifié le droit (requireAdmin("team")).

export type TeamMember = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  timezone: string | null;
  lastSeen: string | null;
  role: AnyRole;
  permissions: Permission[];
  active: boolean;
  /** « env » : propriétaire et administrateurs de l'environnement (modifiables sur Vercel seulement) ; « db » : membres invités. */
  source: "env" | "db";
};

export type PendingInvite = { id: string; email: string; role: StaffRole; permissions: Permission[]; createdAt: string; expiresAt: string; invitedBy: string | null };

const INVITE_DAYS = 7;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const ROLE_ORDER: AnyRole[] = ["owner", ...ROLES];

type ProfileRow = { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null; country: string | null; timezone: string | null; last_seen_at: string | null; twitch_display_name: string | null };

async function profilesOf(ids: string[]) {
  if (ids.length === 0) return new Map<string, ProfileRow>();
  const { data } = await createAdminClient().from("profiles").select("id, first_name, last_name, avatar_url, country, timezone, last_seen_at, twitch_display_name").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id as string, p as ProfileRow]));
}

/** Comptes dont l'adresse est dans la liste (recherche dans les comptes d'authentification, par pages). */
async function usersByEmail(emails: string[]): Promise<Map<string, User>> {
  const want = new Set(emails.map((e) => e.toLowerCase()));
  const out = new Map<string, User>();
  if (want.size === 0) return out;
  const db = createAdminClient();
  for (let page = 1; page <= 20 && out.size < want.size; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) if (u.email && want.has(u.email.toLowerCase())) out.set(u.email.toLowerCase(), u);
    if (data.users.length < 200) break;
  }
  return out;
}

function nameOf(p: ProfileRow | undefined, email: string) {
  const full = [p?.first_name, p?.last_name].filter(Boolean).join(" ");
  return full || p?.twitch_display_name || email.split("@")[0];
}

/** Toute l'équipe : propriétaire, administrateurs de ADMIN_EMAILS, puis les membres invités (rôle et permissions en base). */
export async function listTeam(): Promise<TeamMember[]> {
  if (!hasAdmin) return [];
  const db = createAdminClient();
  const envEmails = [...new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (process.env.OWNER_EMAIL) for (const e of process.env.OWNER_EMAIL.split(",")) if (e.trim() && !envEmails.includes(e.trim().toLowerCase())) envEmails.unshift(e.trim().toLowerCase());
  const [envUsers, { data: rows }] = await Promise.all([usersByEmail(envEmails), db.from("staff_members").select("user_id, role, permissions, active").order("created_at")]);
  const dbRows = (rows ?? []).filter((r) => isRole(r.role));
  const dbUsers = await Promise.all(dbRows.map((r) => db.auth.admin.getUserById(r.user_id as string).then((x) => x.data.user)));
  const ids = [...envUsers.values()].map((u) => u.id).concat(dbRows.map((r) => r.user_id as string));
  const profiles = await profilesOf(ids);

  const out: TeamMember[] = [];
  for (const email of envEmails) {
    const u = envUsers.get(email);
    if (!u) continue; // adresse listée, compte pas encore créé
    const p = profiles.get(u.id);
    const owner = isOwnerEmail(email);
    out.push({
      userId: u.id,
      email,
      firstName: p?.first_name ?? null,
      lastName: p?.last_name ?? null,
      displayName: nameOf(p, email),
      avatarUrl: p?.avatar_url ?? null,
      country: p?.country ?? null,
      timezone: p?.timezone ?? null,
      lastSeen: p?.last_seen_at ?? u.last_sign_in_at ?? null,
      role: owner ? "owner" : "admin",
      permissions: [...ROLE_META[owner ? "owner" : "admin"].presets],
      active: true,
      source: "env",
    });
  }
  dbRows.forEach((r, i) => {
    const u = dbUsers[i];
    if (!u?.email || out.some((m) => m.userId === u.id)) return;
    const p = profiles.get(u.id);
    out.push({
      userId: u.id,
      email: u.email,
      firstName: p?.first_name ?? null,
      lastName: p?.last_name ?? null,
      displayName: nameOf(p, u.email),
      avatarUrl: p?.avatar_url ?? null,
      country: p?.country ?? null,
      timezone: p?.timezone ?? null,
      lastSeen: p?.last_seen_at ?? u.last_sign_in_at ?? null,
      role: r.role as StaffRole,
      permissions: cleanPermissions(r.permissions),
      active: !!r.active,
      source: "db",
    });
  });
  return out.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.displayName.localeCompare(b.displayName, "fr"));
}

export type StaffCard = { id: string; firstName: string; name: string; avatarUrl: string | null; role: AnyRole; country: string | null };

/** Prénom, photo et rôle d'agents (fil du support : « Mathis [SUPPORT] »). Un compte qui n'est plus dans l'équipe garde son nom, sans rôle d'équipe (« support »). */
export async function staffCards(ids: string[]): Promise<Map<string, StaffCard>> {
  const out = new Map<string, StaffCard>();
  const uniq = [...new Set(ids)];
  if (!hasAdmin || uniq.length === 0) return out;
  const db = createAdminClient();
  const [profiles, { data: rows }, users] = await Promise.all([
    profilesOf(uniq),
    db.from("staff_members").select("user_id, role").in("user_id", uniq),
    Promise.all(uniq.map((id) => db.auth.admin.getUserById(id).then((r) => r.data.user))),
  ]);
  const roles = new Map((rows ?? []).filter((r) => isRole(r.role)).map((r) => [r.user_id as string, r.role as StaffRole]));
  uniq.forEach((id, i) => {
    const email = users[i]?.email ?? "";
    const p = profiles.get(id);
    const role: AnyRole = isOwnerEmail(email) ? "owner" : isAdminEmail(email) ? "admin" : (roles.get(id) ?? "support");
    const first = p?.first_name?.trim() || p?.twitch_display_name || "L'équipe";
    out.set(id, { id, firstName: first, name: nameOf(p, email || "Équipe"), avatarUrl: p?.avatar_url ?? null, role, country: p?.country ?? null });
  });
  return out;
}

export async function pendingInvites(): Promise<PendingInvite[]> {
  if (!hasAdmin) return [];
  const { data } = await createAdminClient()
    .from("staff_invites")
    .select("id, email, role, permissions, created_at, expires_at, invited_by")
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).filter((r) => isRole(r.role)).map((r) => ({ id: r.id as string, email: r.email as string, role: r.role as StaffRole, permissions: cleanPermissions(r.permissions), createdAt: r.created_at as string, expiresAt: r.expires_at as string, invitedBy: (r.invited_by as string | null) ?? null }));
}

/** Crée une invitation (remplace les invitations en attente de la même adresse). Renvoie le jeton à envoyer par e-mail : il n'est jamais stocké. */
export async function createInvite(by: string, o: { email: string; role: StaffRole; permissions: Permission[] }): Promise<{ id: string; token: string; expiresAt: Date } | null> {
  const db = createAdminClient();
  const email = o.email.trim().toLowerCase();
  await db.from("staff_invites").update({ revoked_at: new Date().toISOString() }).ilike("email", email).is("accepted_at", null).is("revoked_at", null);
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86400_000);
  const { data, error } = await db
    .from("staff_invites")
    .insert({ email, role: o.role, permissions: o.permissions, token_hash: sha(token), invited_by: by, expires_at: expiresAt.toISOString() })
    .select("id")
    .single();
  if (error || !data) {
    console.error("staff_invites", error?.message);
    return null;
  }
  return { id: data.id as string, token, expiresAt };
}

/** Nouvelle échéance et nouveau jeton pour une invitation en attente (l'ancien lien cesse de marcher). */
export async function renewInvite(id: string): Promise<{ email: string; role: StaffRole; token: string; expiresAt: Date } | null> {
  const db = createAdminClient();
  const { data } = await db.from("staff_invites").select("email, role").eq("id", id).is("accepted_at", null).is("revoked_at", null).maybeSingle();
  if (!data || !isRole(data.role)) return null;
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86400_000);
  const { error } = await db.from("staff_invites").update({ token_hash: sha(token), expires_at: expiresAt.toISOString() }).eq("id", id);
  return error ? null : { email: data.email as string, role: data.role, token, expiresAt };
}

export type InviteView = { email: string; role: StaffRole; permissions: Permission[]; expiresAt: string; inviter: string | null } | null;

/** Invitation valide d'après le jeton du lien (non acceptée, non retirée, non expirée). */
export async function inviteByToken(token: string): Promise<InviteView> {
  if (!hasAdmin || !/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  const db = createAdminClient();
  const { data } = await db.from("staff_invites").select("email, role, permissions, expires_at, invited_by").eq("token_hash", sha(token)).is("accepted_at", null).is("revoked_at", null).maybeSingle();
  if (!data || !isRole(data.role) || Date.parse(data.expires_at as string) <= Date.now()) return null;
  const inviter = data.invited_by ? (await profilesOf([data.invited_by as string])).get(data.invited_by as string) : undefined;
  return { email: data.email as string, role: data.role, permissions: cleanPermissions(data.permissions), expiresAt: data.expires_at as string, inviter: inviter ? nameOf(inviter, "L'équipe") : null };
}

/** Accepte l'invitation avec le compte connecté : l'adresse doit être celle de l'invitation (et vérifiée). */
export async function acceptInvite(token: string, user: Pick<User, "id" | "email" | "email_confirmed_at">): Promise<"ok" | "invalid" | "wrong_email"> {
  const inv = await inviteByToken(token);
  if (!inv) return "invalid";
  if (!user.email_confirmed_at || !user.email || user.email.toLowerCase() !== inv.email.toLowerCase()) return "wrong_email";
  const db = createAdminClient();
  const { data: row } = await db.from("staff_invites").select("id, invited_by").eq("token_hash", sha(token)).maybeSingle();
  const { error } = await db.from("staff_members").upsert({ user_id: user.id, role: inv.role, permissions: inv.permissions, active: true, invited_by: (row?.invited_by as string | null) ?? null, updated_at: new Date().toISOString() });
  if (error) {
    console.error("staff_members", error.message);
    return "invalid";
  }
  await db.from("staff_invites").update({ accepted_at: new Date().toISOString() }).eq("token_hash", sha(token));
  return "ok";
}

