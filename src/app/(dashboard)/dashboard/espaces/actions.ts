"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { getPersonalPlan } from "@/lib/auth/plan";
import { allow } from "@/lib/auth/rateLimit";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { remoteWorkspaceInvite } from "./mail";
import { getActiveWorkspace, listWorkspaces, WS_COOKIE } from "@/lib/workspace";

// Espaces partagés : créer, changer d'espace. Un espace est un compte technique (voir migration 0046) : il n'a ni mot de passe ni connexion.

export type WorkspaceState = { error?: string; id?: string };

const COLORS = ["#3b5bdb", "#7048e8", "#0c8599", "#e8590c", "#2f9e44", "#c2255c"];
const nameSchema = z.string().trim().min(1, "Donne un nom à l'espace.").max(40, "40 caractères au plus.");

async function setCookie(id: string | null) {
  const jar = await cookies();
  if (!id) jar.delete(WS_COOKIE);
  else jar.set(WS_COOKIE, id, { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 365 * 86_400, httpOnly: false });
}

/** Passe d'un espace à l'autre (null : espace personnel). Seuls les espaces dont on est membre sont acceptés. */
export async function switchWorkspaceAction(id: string | null): Promise<WorkspaceState> {
  await requireUser("/dashboard");
  if (id !== null && !(await listWorkspaces()).some((w) => w.id === id)) return { error: "Cet espace n'existe plus ou tu n'en fais plus partie." };
  await setCookie(id);
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function createWorkspaceAction(raw: { name: string }): Promise<WorkspaceState> {
  const user = await requireUser("/dashboard");
  const parsed = nameSchema.safeParse(raw.name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nom invalide." };
  if (!hasAdmin) return { error: "Les espaces partagés ne sont pas disponibles pour le moment." };
  const plan = await getPersonalPlan();
  const db = createAdminClient();
  const { count } = await db.from("workspaces").select("id", { count: "exact", head: true }).eq("created_by", user.id);
  if (plan.maxWorkspaces <= 0) return { error: `Les espaces partagés ne sont pas inclus dans la formule ${plan.name}.` };
  if ((count ?? 0) >= plan.maxWorkspaces) return { error: `Limite atteinte : ${plan.maxWorkspaces} espace${plan.maxWorkspaces > 1 ? "s" : ""} partagé${plan.maxWorkspaces > 1 ? "s" : ""} au plus avec la formule ${plan.name}.` };
  if (!(await allow(`ws-create:${user.id}`, 5, 3600))) return { error: "Trop de créations. Réessaie dans une heure." };

  // 1. Le compte technique de l'espace : adresse inventée, sans mot de passe, connexion impossible (suspendu pour très longtemps).
  const wsKey = crypto.randomUUID();
  const { data: created, error } = await db.auth.admin.createUser({
    email: `espace-${wsKey}@espaces.syxtee-networks.fr`,
    email_confirm: true,
    ban_duration: "876000h",
    user_metadata: { workspace: true, name: parsed.data },
  });
  if (error || !created.user) {
    console.error("createWorkspace: createUser", error?.message);
    return { error: "Impossible de créer l'espace pour le moment. Réessaie dans un instant." };
  }
  const id = created.user.id;
  const color = COLORS[(count ?? 0) % COLORS.length];

  // 2. L'espace, son propriétaire, et la formule du créateur copiée sur le compte technique (le Core s'y fie pour les limites de flux).
  const profile = await getProfile();
  const admin = isAdminEmail(user.email);
  const [ws, member, prof] = await Promise.all([
    db.from("workspaces").insert({ id, name: parsed.data, color, created_by: user.id }),
    db.from("workspace_members").insert({ workspace_id: id, user_id: user.id, role: "owner" }),
    db.from("profiles").update({ plan: admin ? "admin" : (profile?.plan ?? "free"), plan_until: admin ? null : (profile?.plan_until ?? null), suspended_at: profile?.suspended_at ?? null, onboarded_at: new Date().toISOString() }).eq("id", id),
  ]);
  if (ws.error || member.error || prof.error) {
    console.error("createWorkspace", ws.error?.message, member.error?.message, prof.error?.message);
    await db.auth.admin.deleteUser(id).catch(() => {});
    return { error: "Impossible de créer l'espace pour le moment. Réessaie dans un instant." };
  }
  await setCookie(id);
  revalidatePath("/dashboard", "layout");
  return { id };
}

// ───── Membres d'un espace ─────

const MAX_MEMBERS = 25;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Espace actif, et droit de le gérer (propriétaire ou administrateur). */
async function managedWorkspace() {
  const user = await requireUser("/dashboard/invitations");
  const ws = await getActiveWorkspace();
  if (!ws) return { error: "Choisis d'abord un espace partagé." as const };
  if (ws.role === "member") return { error: "Seuls les administrateurs de l'espace peuvent gérer les membres." as const };
  return { user, ws };
}

/** Invite un membre par email : il doit avoir (ou créer) un compte avec cette adresse. */
export async function inviteMemberAction(raw: { email: string; role: "admin" | "member" }): Promise<WorkspaceState> {
  const m = await managedWorkspace();
  if ("error" in m) return { error: m.error };
  const email = z.email().safeParse(raw.email.trim().toLowerCase());
  if (!email.success) return { error: "Cette adresse email n'est pas valide." };
  if (raw.role !== "admin" && raw.role !== "member") return { error: "Rôle invalide." };
  if (!hasAdmin) return { error: "Indisponible pour le moment." };
  if (!(await allow(`ws-invite:${m.user.id}`, 20, 3600))) return { error: "Trop d'invitations. Réessaie dans une heure." };
  const db = createAdminClient();
  const [{ count: members }, { count: pending }] = await Promise.all([
    db.from("workspace_members").select("user_id", { count: "exact", head: true }).eq("workspace_id", m.ws.id),
    db.from("workspace_invites").select("id", { count: "exact", head: true }).eq("workspace_id", m.ws.id).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()),
  ]);
  if ((members ?? 0) + (pending ?? 0) >= MAX_MEMBERS) return { error: `Cet espace a atteint ${MAX_MEMBERS} membres (invitations comprises).` };
  const token = `swi_${randomBytes(24).toString("hex")}`;
  const expires = new Date(Date.now() + 7 * 86_400_000);
  const { error } = await db.from("workspace_invites").insert({ workspace_id: m.ws.id, email: email.data, role: raw.role, token_hash: hashToken(token), invited_by: m.user.id, expires_at: expires.toISOString() });
  if (error) {
    console.error("inviteMember", error.message);
    return { error: "Impossible d'envoyer l'invitation. Réessaie dans un instant." };
  }
  const profile = await getProfile();
  const ownerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.twitch_display_name || "Un streamer";
  const sent = await remoteWorkspaceInvite(email.data, { ownerName, workspace: m.ws.name, role: raw.role, token, expires });
  revalidatePath("/dashboard/invitations");
  return sent ? {} : { error: "L'invitation est créée mais l'email n'a pas pu partir. Retire-la et réessaie plus tard." };
}

export async function revokeMemberInviteAction(inviteId: string): Promise<WorkspaceState> {
  const m = await managedWorkspace();
  if ("error" in m) return { error: m.error };
  if (!z.uuid().safeParse(inviteId).success || !hasAdmin) return { error: "Invitation introuvable." };
  await createAdminClient().from("workspace_invites").update({ revoked_at: new Date().toISOString() }).eq("id", inviteId).eq("workspace_id", m.ws.id);
  revalidatePath("/dashboard/invitations");
  return {};
}

/** Retire un membre (pas le propriétaire ; un administrateur ne retire pas un autre administrateur). */
export async function removeMemberAction(userId: string): Promise<WorkspaceState> {
  const m = await managedWorkspace();
  if ("error" in m) return { error: m.error };
  if (!z.uuid().safeParse(userId).success || !hasAdmin) return { error: "Membre introuvable." };
  const db = createAdminClient();
  const { data: target } = await db.from("workspace_members").select("role").eq("workspace_id", m.ws.id).eq("user_id", userId).maybeSingle();
  if (!target) return { error: "Membre introuvable." };
  if (target.role === "owner") return { error: "Le propriétaire ne peut pas être retiré." };
  if (target.role === "admin" && m.ws.role !== "owner") return { error: "Seul le propriétaire retire un administrateur." };
  await db.from("workspace_members").delete().eq("workspace_id", m.ws.id).eq("user_id", userId);
  revalidatePath("/dashboard/invitations");
  return {};
}

/** Change le rôle d'un membre (administrateur ou membre). Réservé au propriétaire. */
export async function setMemberRoleAction(userId: string, role: "admin" | "member"): Promise<WorkspaceState> {
  const m = await managedWorkspace();
  if ("error" in m) return { error: m.error };
  if (m.ws.role !== "owner") return { error: "Seul le propriétaire change les rôles." };
  if (!z.uuid().safeParse(userId).success || (role !== "admin" && role !== "member") || !hasAdmin) return { error: "Demande invalide." };
  await createAdminClient().from("workspace_members").update({ role }).eq("workspace_id", m.ws.id).eq("user_id", userId).neq("role", "owner");
  revalidatePath("/dashboard/invitations");
  return {};
}

/** Quitte l'espace actif (sauf propriétaire) et revient à l'espace personnel. */
export async function leaveWorkspaceAction(): Promise<WorkspaceState> {
  const user = await requireUser("/dashboard");
  const ws = await getActiveWorkspace();
  if (!ws) return {};
  if (ws.role === "owner") return { error: "Le propriétaire ne peut pas quitter son espace." };
  if (hasAdmin) await createAdminClient().from("workspace_members").delete().eq("workspace_id", ws.id).eq("user_id", user.id);
  await setCookie(null);
  revalidatePath("/dashboard", "layout");
  return {};
}

/** Renomme un espace (propriétaire ou administrateur de cet espace). */
export async function renameWorkspaceAction(raw: { id: string; name: string }): Promise<WorkspaceState> {
  await requireUser("/dashboard/invitations");
  const ws = (await listWorkspaces()).find((w) => w.id === raw.id);
  if (!ws) return { error: "Cet espace n'existe plus ou tu n'en fais plus partie." };
  if (ws.role === "member") return { error: "Seuls le propriétaire et les administrateurs renomment l'espace." };
  const parsed = nameSchema.safeParse(raw.name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nom invalide." };
  if (!hasAdmin) return { error: "Indisponible pour le moment." };
  const db = createAdminClient();
  const { error } = await db.from("workspaces").update({ name: parsed.data }).eq("id", ws.id);
  if (error) {
    console.error("renameWorkspace", error.message);
    return { error: "Impossible de renommer l'espace pour le moment." };
  }
  await db.auth.admin.updateUserById(ws.id, { user_metadata: { workspace: true, name: parsed.data } }).catch(() => {});
  revalidatePath("/dashboard", "layout");
  return {};
}

/**
 * Supprime un espace pour de bon (propriétaire seulement, nom retapé). Le compte technique est supprimé : l'espace, ses membres,
 * ses invitations, ses flux, ses OBS reliés et ses sauvegardes partent avec lui (cascade). Les membres retrouvent leur espace personnel.
 */
export async function deleteWorkspaceAction(raw: { id: string; confirm: string }): Promise<WorkspaceState> {
  const user = await requireUser("/dashboard/invitations");
  const ws = (await listWorkspaces()).find((w) => w.id === raw.id);
  if (!ws) return { error: "Cet espace n'existe plus ou tu n'en fais plus partie." };
  if (ws.role !== "owner") return { error: "Seul le propriétaire supprime l'espace." };
  if (raw.confirm.trim().toLowerCase() !== ws.name.trim().toLowerCase()) return { error: "Retape le nom exact de l'espace pour confirmer." };
  if (!hasAdmin) return { error: "Indisponible pour le moment." };
  if (!(await allow(`ws-delete:${user.id}`, 5, 3600))) return { error: "Trop de suppressions. Réessaie dans une heure." };
  const { error } = await createAdminClient().auth.admin.deleteUser(ws.id);
  if (error) {
    console.error("deleteWorkspace", error.message);
    return { error: "Impossible de supprimer l'espace pour le moment. Réessaie dans un instant." };
  }
  if ((await getActiveWorkspace())?.id === ws.id) await setCookie(null);
  revalidatePath("/dashboard", "layout");
  return {};
}

/** Accepte une invitation reçue par email. Le compte connecté doit avoir l'adresse invitée. */
export async function acceptWorkspaceInviteAction(token: string): Promise<WorkspaceState> {
  const user = await requireUser(`/rejoindre/${token}`);
  if (!/^swi_[0-9a-f]{48}$/.test(token) || !hasAdmin) return { error: "Cette invitation n'est pas valide." };
  if (!(await allow(`ws-accept:${user.id}`, 20, 3600))) return { error: "Trop d'essais. Réessaie dans une heure." };
  const db = createAdminClient();
  const { data: inv } = await db.from("workspace_invites").select("id, workspace_id, email, role, expires_at, accepted_at, revoked_at").eq("token_hash", hashToken(token)).maybeSingle();
  if (!inv || inv.accepted_at || inv.revoked_at || Date.parse(inv.expires_at) <= Date.now()) return { error: "Cette invitation n'est plus valable : demande-en une nouvelle." };
  if (!user.email || user.email.toLowerCase() !== String(inv.email).toLowerCase()) return { error: `Cette invitation est pour ${inv.email}. Connecte-toi avec cette adresse.` };
  const { error } = await db.from("workspace_members").upsert({ workspace_id: inv.workspace_id, user_id: user.id, role: inv.role }, { onConflict: "workspace_id,user_id", ignoreDuplicates: true });
  if (error) {
    console.error("acceptInvite", error.message);
    return { error: "Impossible de rejoindre l'espace pour le moment." };
  }
  await db.from("workspace_invites").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);
  await setCookie(inv.workspace_id);
  revalidatePath("/dashboard", "layout");
  return { id: inv.workspace_id };
}
