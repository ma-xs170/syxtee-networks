"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { staffInvite } from "@/emails/templates";
import { requireAdmin } from "@/lib/admin";
import { loginLink } from "@/emails/templates";
import { sendEmailResult, senderAddress } from "@/lib/email/send";
import { audit } from "@/lib/plan-admin";
import { site } from "@/lib/site";
import { cleanPermissions, isRole, ROLE_META } from "@/lib/staff";
import { createInvite, renewInvite } from "@/lib/staff-data";
import { createAdminClient } from "@/lib/supabase/admin";

// Gestion de l'équipe : réservée au propriétaire (requireAdmin("team"), TOTP vérifié). Chaque action est journalisée.

export type TeamState = { ok?: string; error?: string; link?: string };

const email = z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254);

async function inviterName(userId: string, fallback: string) {
  const { data } = await createAdminClient().from("profiles").select("first_name").eq("id", userId).maybeSingle();
  return (data?.first_name as string | null) || fallback;
}

/** Envoie le lien d'invitation. Si l'e-mail ne part pas, le lien est rendu au propriétaire pour qu'il l'envoie lui-même. */
async function mailInvite(to: string, inviter: string, role: Parameters<typeof staffInvite>[0]["role"], token: string, expires: Date): Promise<TeamState> {
  const link = `${site.url}/equipe/invitation/${token}`;
  const sent = await sendEmailResult(to, staffInvite({ inviter, role, url: link, expires }));
  // Le lien est toujours rendu : un e-mail peut finir dans les indésirables, ou ne pas partir tant que le domaine d'envoi n'est pas vérifié.
  return sent.ok ? { ok: `Invitation envoyée à ${to}. Si la personne ne reçoit rien (regarde les indésirables), envoie-lui ce lien toi-même.`, link } : { ok: `Invitation créée pour ${to}.`, error: `E-mail non envoyé (${sent.reason}). Copie le lien ci-dessous et envoie-le toi-même.`, link };
}

export async function inviteStaffAction(_prev: TeamState, form: FormData): Promise<TeamState> {
  const owner = await requireAdmin("team");
  const parsedEmail = email.safeParse(form.get("email"));
  if (!parsedEmail.success) return { error: parsedEmail.error.issues[0]?.message };
  const role = form.get("role");
  if (!isRole(role)) return { error: "Choisis un rôle." };
  const chosen = cleanPermissions(form.getAll("permissions"));
  const permissions = chosen.length ? chosen : [...ROLE_META[role].presets];
  const inv = await createInvite(owner.id, { email: parsedEmail.data, role, permissions });
  if (!inv) return { error: "Création de l'invitation impossible (migration 0047 appliquée ?)." };
  await audit(owner.email!, "team.invite", null, null, { email: parsedEmail.data, role, permissions });
  revalidatePath("/admin/equipe");
  return mailInvite(parsedEmail.data, await inviterName(owner.id, "L'équipe SYXTEE"), role, inv.token, inv.expiresAt);
}

/** Envoie un e-mail de test à l'adresse du propriétaire et dit exactement ce que le serveur voit (expéditeur, raison d'un échec). */
export async function testEmailAction(_prev: TeamState): Promise<TeamState> {
  const owner = await requireAdmin("team");
  const sent = await sendEmailResult(owner.email!, loginLink({ url: site.url }));
  return sent.ok
    ? { ok: `E-mail de test parti de « ${senderAddress} » vers ${owner.email}. Regarde aussi les indésirables.` }
    : { error: `Échec depuis « ${senderAddress} » : ${sent.reason}` };
}

export async function resendInviteAction(inviteId: string, _prev: TeamState): Promise<TeamState> {
  const owner = await requireAdmin("team");
  const inv = await renewInvite(inviteId);
  if (!inv) return { error: "Invitation introuvable ou déjà utilisée." };
  await audit(owner.email!, "team.invite.resend", null, null, { email: inv.email });
  revalidatePath("/admin/equipe");
  return mailInvite(inv.email, await inviterName(owner.id, "L'équipe SYXTEE"), inv.role, inv.token, inv.expiresAt);
}

export async function revokeInviteAction(inviteId: string) {
  const owner = await requireAdmin("team");
  await createAdminClient().from("staff_invites").update({ revoked_at: new Date().toISOString() }).eq("id", inviteId).is("accepted_at", null);
  await audit(owner.email!, "team.invite.revoke", null, null, { invite: inviteId });
  revalidatePath("/admin/equipe");
}

/** Rôle, permissions et activation d'un membre invité (les administrateurs de l'environnement se gèrent sur Vercel). */
export async function updateMemberAction(userId: string, _prev: TeamState, form: FormData): Promise<TeamState> {
  const owner = await requireAdmin("team");
  const role = form.get("role");
  if (!isRole(role)) return { error: "Choisis un rôle." };
  const permissions = cleanPermissions(form.getAll("permissions"));
  const active = form.get("active") === "on";
  const db = createAdminClient();
  const { data: before } = await db.from("staff_members").select("role, permissions, active").eq("user_id", userId).maybeSingle();
  if (!before) return { error: "Membre introuvable." };
  const { error } = await db.from("staff_members").update({ role, permissions, active, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) return { error: "Enregistrement impossible." };
  await audit(owner.email!, "team.update", userId, before, { role, permissions, active });
  revalidatePath("/admin/equipe");
  return { ok: "Enregistré." };
}

export async function removeMemberAction(userId: string) {
  const owner = await requireAdmin("team");
  await createAdminClient().from("staff_members").delete().eq("user_id", userId);
  await audit(owner.email!, "team.remove", userId, null, null);
  revalidatePath("/admin/equipe");
}

/** Envoie au membre le lien de choix d'un nouveau mot de passe (e-mail du site, valable 1 h). */
export async function resetMemberPasswordAction(userId: string, _prev: TeamState): Promise<TeamState> {
  const owner = await requireAdmin("team");
  const db = createAdminClient();
  const { data } = await db.auth.admin.getUserById(userId);
  const to = data.user?.email;
  if (!to) return { error: "Compte introuvable." };
  const { error } = await db.auth.resetPasswordForEmail(to, { redirectTo: `${site.url}/auth/confirm?next=${encodeURIComponent("/reinitialiser")}` });
  if (error) return { error: error.code === "over_email_send_rate_limit" ? "Trop d'envois : réessaie dans quelques minutes." : "Envoi impossible." };
  await audit(owner.email!, "team.password.reset", userId, null, null);
  return { ok: `Lien de nouveau mot de passe envoyé à ${to}.` };
}
