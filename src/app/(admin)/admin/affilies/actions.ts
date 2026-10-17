"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { affiliateInvite } from "@/emails/templates";
import { requireAdmin } from "@/lib/admin";
import { AFFILIATE_COLUMNS, affiliateUrl, displayNameSchema, freeSlug, kitUrl, slugify, slugSchema, type Affiliate } from "@/lib/affiliates";
import { sendEmailResult } from "@/lib/email/send";
import { isManagedEmail, loginToEmail } from "@/lib/managed";
import { audit } from "@/lib/plan-admin";
import { site } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

// Affiliés (admin) : inviter par e-mail, renvoyer l'invitation, désactiver, retirer. Permission « partners » (TOTP vérifié), chaque action est journalisée.
export type AffiliateState = { ok?: string; error?: string };

const refresh = () => revalidatePath("/admin/affilies");
const mail = (a: Pick<Affiliate, "display_name" | "slug">) => affiliateInvite({ displayName: a.display_name, shareUrl: affiliateUrl(a.slug), dashboardUrl: `${site.url}/dashboard/affilie`, kitUrl });

export async function inviteAffiliateAction(_prev: AffiliateState, form: FormData): Promise<AffiliateState> {
  const admin = await requireAdmin("partners");
  // « E-mail ou identifiant » : une adresse, ou l'identifiant d'un compte géré (sans e-mail réel : pas d'envoi, le compte est relié tout de suite).
  const who = String(form.get("email") ?? "").trim().toLowerCase();
  let userId: string | null = null;
  let managedLogin = false;
  let email: { success: true; data: string } | { success: false; error: { issues: { message: string }[] } };
  if (who.includes("@")) {
    email = z.email("Adresse e-mail invalide.").safeParse(who);
  } else {
    const { data: m } = await createAdminClient().from("managed_accounts").select("user_id, login").eq("login", who).maybeSingle();
    if (!m) return { error: "Aucun compte avec cet identifiant. Saisis une adresse e-mail ou l'identifiant d'un compte géré." };
    userId = m.user_id as string;
    managedLogin = true;
    email = { success: true, data: loginToEmail(m.login as string) };
  }
  if (!email.success) return { error: email.error.issues[0]?.message ?? "Adresse e-mail invalide." };
  const pseudoRaw = String(form.get("pseudo") ?? "").trim();
  const pseudo = displayNameSchema.safeParse(pseudoRaw || email.data.split("@")[0].slice(0, 40));
  if (!pseudo.success) return { error: pseudo.error.issues[0]?.message ?? "Pseudo invalide." };
  const slugRaw = String(form.get("slug") ?? "").trim();
  let slug: string;
  if (slugRaw) {
    const s = slugSchema.safeParse(slugRaw);
    if (!s.success) return { error: s.error.issues[0]?.message ?? "Nom d'URL invalide." };
    slug = s.data;
  } else {
    slug = await freeSlug(slugify(pseudoRaw) || slugify(email.data.split("@")[0]));
  }
  const db = createAdminClient();
  const { data, error } = await db.from("affiliates").insert({ email: email.data, slug, display_name: pseudo.data, invited_by: admin.email, user_id: userId }).select(AFFILIATE_COLUMNS).single<Affiliate>();
  if (error || !data) {
    if (error?.code === "23505") return { error: /slug/.test(error.message) ? "Ce nom d'URL est déjà pris." : "Ce compte est déjà invité." };
    return { error: `Invitation impossible (${error?.message ?? "erreur"}). Migration 0053 appliquée ?` };
  }
  await audit(admin.email!, "affiliate.invite", null, null, { email: data.email, slug: data.slug });
  refresh();
  if (managedLogin) return { ok: `Affilié créé pour l'identifiant ${who} (pas d'e-mail : il verra « Affilié » dans son dashboard). Lien : ${affiliateUrl(data.slug)}` };
  const sent = await sendEmailResult(data.email, mail(data));
  return sent.ok ? { ok: `Invitation envoyée à ${data.email}. Lien : ${affiliateUrl(data.slug)}` } : { ok: `Affilié créé (${affiliateUrl(data.slug)}), mais l'e-mail n'est pas parti : ${sent.reason}.` };
}

export async function resendAffiliateAction(form: FormData) {
  const admin = await requireAdmin("partners");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  const { data } = await createAdminClient().from("affiliates").select(AFFILIATE_COLUMNS).eq("id", id.data).maybeSingle<Affiliate>();
  if (!data) return;
  if (isManagedEmail(data.email)) return;
  await sendEmailResult(data.email, mail(data));
  await audit(admin.email!, "affiliate.resend", null, null, { email: data.email });
  refresh();
}

export async function toggleAffiliateAction(form: FormData) {
  const admin = await requireAdmin("partners");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  const active = form.get("active") === "true";
  await createAdminClient().from("affiliates").update({ active }).eq("id", id.data);
  await audit(admin.email!, active ? "affiliate.enable" : "affiliate.disable", null, null, { id: id.data });
  refresh();
}

export async function removeAffiliateAction(form: FormData) {
  const admin = await requireAdmin("partners");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  await createAdminClient().from("affiliates").delete().eq("id", id.data);
  await audit(admin.email!, "affiliate.remove", null, null, { id: id.data });
  refresh();
}
