"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { BotMessageGone, botAnnounce, botEdit, hasBot } from "@/lib/discord-bot";
import { audit } from "@/lib/plan-admin";
import { formatVersion, nextVersion, releaseNotification, type Version } from "@/lib/releases";
import { createAdminClient } from "@/lib/supabase/admin";

// Notes de version (admin) : le numéro est calculé ici (jamais saisi), la note est enregistrée puis envoyée dans le salon Discord.

export type ReleaseState = { ok?: string; error?: string };

const input = z.object({
  bump: z.enum(["patch", "minor", "major"]),
  title: z.string().trim().min(1, "Titre obligatoire.").max(120, "Titre : 120 caractères au plus."),
  notes: z.string().trim().min(1, "Écris les notes de version.").max(3500, "Notes : 3500 caractères au plus."),
});

type Row = Version & { id: string; title: string; notes: string };

const embedOf = (v: Version, title: string, notes: string) => ({ title: `Patchnote v${formatVersion(v)} · ${title}`, body: notes, tag: "Patchnote" });

/** Publie la note dans le salon et renvoie l'identifiant du message (gardé pour pouvoir le modifier). */
async function sendToDiscord(v: Version, title: string, notes: string) {
  return (await botAnnounce(embedOf(v, title, notes))).id;
}

export async function publishReleaseAction(_prev: ReleaseState, form: FormData): Promise<ReleaseState> {
  const admin = await requireAdmin();
  const parsed = input.safeParse({ bump: form.get("bump"), title: form.get("title"), notes: form.get("notes") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { bump, title, notes } = parsed.data;
  const send = form.get("discord") === "on";
  const notify = form.get("site") === "on";
  const db = createAdminClient();

  const { data: last } = await db.from("releases").select("major, minor, patch").order("major", { ascending: false }).order("minor", { ascending: false }).order("patch", { ascending: false }).limit(1).maybeSingle();
  const v = nextVersion((last as Version | null) ?? null, bump);
  const { data: row, error } = await db.from("releases").insert({ ...v, title, notes, created_by: admin.email! }).select("id").single();
  if (error || !row) {
    console.error("releases", error?.message);
    return { error: error?.code === "23505" ? "Une autre version vient d'être publiée : recharge la page." : "Enregistrement impossible (migration 0037 appliquée ?)." };
  }
  await audit(admin.email!, "release.publish", null, null, { version: formatVersion(v), title });
  revalidatePath("/admin/versions");

  let siteNote = "";
  if (notify) {
    const { error: nErr } = await db.from("notifications").insert({ user_id: null, ...releaseNotification(v, title, notes) });
    if (nErr) console.error("release notification", nErr.message);
    siteNote = nErr ? " La notification du site a échoué." : " Tous les comptes sont notifiés sur le site.";
  }
  if (!send) return { ok: `Patchnote ${formatVersion(v)} enregistrée.${siteNote}` };
  if (!hasBot) return { ok: `Patchnote ${formatVersion(v)} enregistrée, mais le bot Discord n'est pas configuré.${siteNote}` };
  try {
    const messageId = await sendToDiscord(v, title, notes);
    await db.from("releases").update({ discord_sent_at: new Date().toISOString(), discord_message_id: messageId }).eq("id", row.id);
    return { ok: `Patchnote ${formatVersion(v)} publiée et envoyée dans le salon Discord.${siteNote}` };
  } catch (e) {
    return { error: `Version ${formatVersion(v)} enregistrée, mais l'envoi Discord a échoué (${e instanceof Error ? e.message : "bot injoignable"}). Utilise « Renvoyer sur Discord ».` };
  }
}

export async function resendReleaseAction(form: FormData) {
  const admin = await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  const db = createAdminClient();
  const { data } = await db.from("releases").select("id, major, minor, patch, title, notes").eq("id", id.data).maybeSingle();
  if (!data) return;
  const r = data as Row;
  try {
    const messageId = await sendToDiscord(r, r.title, r.notes);
    await db.from("releases").update({ discord_sent_at: new Date().toISOString(), discord_message_id: messageId }).eq("id", r.id);
    await audit(admin.email!, "release.resend", null, null, { version: formatVersion(r) });
  } catch (e) {
    console.error("release resend", e);
  }
  revalidatePath("/admin/versions");
}

const edit = z.object({ id: z.uuid(), title: input.shape.title, notes: input.shape.notes });

/** Modifie une version : texte enregistré, et message Discord mis à jour s'il existe. Le numéro ne change jamais. */
export async function editReleaseAction(_prev: ReleaseState, form: FormData): Promise<ReleaseState> {
  const admin = await requireAdmin();
  const parsed = edit.safeParse({ id: form.get("id"), title: form.get("title"), notes: form.get("notes") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { id, title, notes } = parsed.data;
  const db = createAdminClient();
  const { data } = await db.from("releases").select("id, major, minor, patch, discord_message_id").eq("id", id).maybeSingle();
  if (!data) return { error: "Version introuvable." };
  const r = data as Version & { discord_message_id: string | null };
  const { error } = await db.from("releases").update({ title, notes, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    console.error("releases edit", error.message);
    return { error: "Enregistrement impossible (migration 0038 appliquée ?)." };
  }
  await audit(admin.email!, "release.edit", null, null, { version: formatVersion(r), title });
  revalidatePath("/admin/versions");
  if (!r.discord_message_id) return { ok: "Modifiée sur le site. Aucun message Discord n'est lié à cette version : utilise « Envoyer » ou « Renvoyer » pour le publier." };
  try {
    await botEdit({ messageId: r.discord_message_id, ...embedOf(r, title, notes) });
    return { ok: "Modifiée, et le message Discord est mis à jour." };
  } catch (e) {
    if (e instanceof BotMessageGone) return { error: "Modifiée sur le site, mais le message n'existe plus dans le salon. Utilise « Renvoyer » pour le republier." };
    return { error: `Modifiée sur le site, mais Discord n'a pas pu être mis à jour (${e instanceof Error ? e.message : "bot injoignable"}).` };
  }
}
