"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { botAnnounce, hasBot } from "@/lib/discord-bot";
import { audit } from "@/lib/plan-admin";
import { formatVersion, nextVersion, type Version } from "@/lib/releases";
import { createAdminClient } from "@/lib/supabase/admin";

// Notes de version (admin) : le numéro est calculé ici (jamais saisi), la note est enregistrée puis envoyée dans le salon Discord.

export type ReleaseState = { ok?: string; error?: string };

const input = z.object({
  bump: z.enum(["patch", "minor", "major"]),
  title: z.string().trim().min(1, "Titre obligatoire.").max(120, "Titre : 120 caractères au plus."),
  notes: z.string().trim().min(1, "Écris les notes de version.").max(3500, "Notes : 3500 caractères au plus."),
});

type Row = Version & { id: string; title: string; notes: string };

async function sendToDiscord(v: Version, title: string, notes: string) {
  await botAnnounce({ title: `Version ${formatVersion(v)} · ${title}`, body: notes, tag: `Version ${formatVersion(v)}` });
}

export async function publishReleaseAction(_prev: ReleaseState, form: FormData): Promise<ReleaseState> {
  const admin = await requireAdmin();
  const parsed = input.safeParse({ bump: form.get("bump"), title: form.get("title"), notes: form.get("notes") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { bump, title, notes } = parsed.data;
  const send = form.get("discord") === "on";
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

  if (!send) return { ok: `Version ${formatVersion(v)} enregistrée.` };
  if (!hasBot) return { ok: `Version ${formatVersion(v)} enregistrée, mais le bot Discord n'est pas configuré.` };
  try {
    await sendToDiscord(v, title, notes);
    await db.from("releases").update({ discord_sent_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: `Version ${formatVersion(v)} publiée et envoyée dans le salon Discord.` };
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
    await sendToDiscord(r, r.title, r.notes);
    await db.from("releases").update({ discord_sent_at: new Date().toISOString() }).eq("id", r.id);
    await audit(admin.email!, "release.resend", null, null, { version: formatVersion(r) });
  } catch (e) {
    console.error("release resend", e);
  }
  revalidatePath("/admin/versions");
}
