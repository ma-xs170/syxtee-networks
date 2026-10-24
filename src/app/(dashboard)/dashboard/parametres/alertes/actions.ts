"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DISCORD_RE } from "@/lib/alerts";
import { allow } from "@/lib/auth/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { canManage, requireOwner } from "@/lib/workspace";

// Alertes Discord du compte : adresse du webhook et les deux familles d'alertes (flux perdu, plafond mensuel).

export type AlertState = { error?: string; ok?: boolean };
const PATH = "/dashboard/parametres/alertes";

const schema = z.object({
  url: z.string().trim().max(200).refine((v) => v === "" || DISCORD_RE.test(v), "Colle l'adresse d'un webhook Discord (https://discord.com/api/webhooks/…)."),
  onDrop: z.boolean(),
  onQuota: z.boolean(),
});

export async function saveAlertsAction(input: { url: string; onDrop: boolean; onQuota: boolean }): Promise<AlertState> {
  const { id, workspace } = await requireOwner(PATH);
  if (!canManage(workspace)) return { error: "Seuls les gestionnaires de l'espace règlent les alertes." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Réglages invalides." };
  if (!(await allow(`alerts:${id}`, 30, 3600))) return { error: "Trop de modifications. Réessaie dans un moment." };
  const { url, onDrop, onQuota } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("alert_settings").upsert({ user_id: id, discord_url: url || null, on_drop: onDrop, on_quota: onQuota, updated_at: new Date().toISOString() });
  if (error) {
    console.error("saveAlertsAction", error.message);
    return { error: "Enregistrement impossible. Réessaie dans un instant." };
  }
  revalidatePath(PATH);
  return { ok: true };
}

/** Envoie un message d'essai sur le webhook enregistré (pas sur une adresse tapée : rien d'autre ne peut être joint depuis le serveur). */
export async function testAlertAction(): Promise<AlertState> {
  const { id, workspace } = await requireOwner(PATH);
  if (!canManage(workspace)) return { error: "Seuls les gestionnaires de l'espace règlent les alertes." };
  if (!(await allow(`alerts-test:${id}`, 5, 600))) return { error: "Trop d'essais. Réessaie dans quelques minutes." };
  const supabase = await createClient();
  const { data } = await supabase.from("alert_settings").select("discord_url").eq("user_id", id).maybeSingle();
  const url = (data as { discord_url: string | null } | null)?.discord_url;
  if (!url || !DISCORD_RE.test(url)) return { error: "Enregistre d'abord l'adresse du webhook." };
  try {
    const res = await fetch(url, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "SYXTEE NETWORKS", embeds: [{ title: "Alerte de test", description: "Ça marche : tu recevras ici les alertes de ton direct.", color: 0x2fb344 }] }),
    });
    if (!res.ok) return { error: `Discord a refusé le message (${res.status}). Vérifie que le webhook existe encore.` };
    return { ok: true };
  } catch {
    return { error: "Discord ne répond pas. Réessaie dans un instant." };
  }
}
