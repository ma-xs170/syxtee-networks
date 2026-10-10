"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth/dal";
import { canManage, requireOwner } from "@/lib/workspace";
import { getPlan, LOCKED_MESSAGE } from "@/lib/auth/plan";
import { allow } from "@/lib/auth/rateLimit";
import { CoreRefusal, createInvite, revokeInvite } from "@/lib/core";
import { remoteInvite } from "@/emails/templates";
import { sendEmailResult } from "@/lib/email/send";
import { can, inviteLimit } from "@/lib/plans";
import { site } from "@/lib/site";

// Invitations au contrôle à distance : un lien secret donne accès à OBS, mais seulement à la personne invitée : elle doit créer un compte
// (ou se connecter) avec l'adresse email indiquée. Le secret n'est montré qu'à la création (le Core n'en garde que l'empreinte) ; l'email porte le même lien.

export type InviteState = { error?: string; url?: string; emailed?: boolean; emailNote?: string };

const input = z.object({
  label: z.string().trim().min(1, "Donne un nom à l'invitation.").max(40, "40 caractères au plus."),
  email: z.string().trim().min(1, "Indique l'adresse email de la personne.").max(254),
  level: z.enum(["view", "scenes", "full"]),
  deviceId: z.uuid().optional().or(z.literal("")),
  /** 0 : jusqu'à révocation. */
  expiresHours: z.number().int().min(0).max(24 * 365),
});

export async function createInviteAction(raw: z.input<typeof input>): Promise<InviteState> {
  const user = await requireOwner("/dashboard/invitations");
  if (!canManage(user.workspace)) return { error: "Seuls les administrateurs de l'espace peuvent inviter." };
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const { label, level, expiresHours } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  if (!z.email().safeParse(email).success) return { error: "Cette adresse email n'est pas valide." };
  const plan = await getPlan();
  if (!can(plan, "remote")) return { error: LOCKED_MESSAGE };
  if (plan.maxInvites <= 0) return { error: `Les invités ne sont pas inclus dans la formule ${plan.name}.` };
  if (!(await allow(`invite-create:${user.id}`, 20, 3600))) return { error: "Trop d'invitations d'un coup. Réessaie dans une heure." };
  let r;
  try {
    r = await createInvite(user.id, { label, email, level, deviceId: parsed.data.deviceId || undefined, expiresHours: expiresHours || undefined, limit: inviteLimit(plan) });
  } catch (e) {
    if (e instanceof CoreRefusal) return { error: e.code === "quota" ? `Limite atteinte : ${plan.maxInvites} invité${plan.maxInvites > 1 ? "s" : ""} au plus avec la formule ${plan.name}. Retires-en un avant d'en ajouter.` : e.code === "forbidden" ? `Les invités ne sont pas inclus dans la formule ${plan.name}.` : "Invitation refusée." };
    console.error("createInvite", e);
    return { error: "Le serveur ne répond pas. Réessaie dans un instant." };
  }
  if (!r) return { error: "Le serveur n'est pas encore à jour pour les invitations. Réessaie après sa mise à jour." };
  revalidatePath("/dashboard/invitations");
  const url = `${site.url}/invitation/${r.token}?o=${user.id}&i=${r.id}`;
  const profile = await getProfile();
  const ownerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.twitch_display_name || "Un streamer";
  const sent = await sendEmailResult(email, remoteInvite({ ownerName, label, level, url, expires: r.expires_at ? new Date(r.expires_at) : null }));
  return sent.ok ? { url, emailed: true } : { url, emailed: false, emailNote: "L'email n'a pas pu partir : copie le lien et envoie-le toi-même." };
}

export async function revokeInviteAction(inviteId: string): Promise<{ error?: string }> {
  const user = await requireOwner("/dashboard/invitations");
  if (!canManage(user.workspace)) return { error: "Seuls les administrateurs de l'espace peuvent retirer un invité." };
  if (!z.uuid().safeParse(inviteId).success) return { error: "Invitation introuvable." };
  try {
    await revokeInvite(user.id, inviteId);
  } catch (e) {
    console.error("revokeInvite", e);
    return { error: "Le serveur ne répond pas. Réessaie dans un instant." };
  }
  revalidatePath("/dashboard/invitations");
  return {};
}
