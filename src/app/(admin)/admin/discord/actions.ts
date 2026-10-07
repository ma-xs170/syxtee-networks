"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { botAlerts, botAnnounce, botPostServices, botPresence } from "@/lib/discord-bot";
import { audit } from "@/lib/plan-admin";

// Actions du panel Discord (admin) : annonce dans le salon, statut du bot, alertes de panne, état des services. Journalisées.

export type BotState = { ok?: string; error?: string };

const fail = (e: unknown): BotState => ({ error: e instanceof Error ? e.message : "Le bot ne répond pas." });

const announce = z.object({
  title: z.string().trim().min(1, "Titre obligatoire.").max(200, "Titre : 200 caractères au plus."),
  body: z.string().trim().min(1, "Message obligatoire.").max(3500, "Message : 3500 caractères au plus."),
  url: z.string().trim().max(300),
});

export async function sendAnnounceAction(_prev: BotState, form: FormData): Promise<BotState> {
  const admin = await requireAdmin("discord");
  const parsed = announce.safeParse({ title: form.get("title"), body: form.get("body"), url: form.get("url") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { title, body, url } = parsed.data;
  if (url && !z.url().safeParse(url).success) return { error: "Lien invalide (https://…)." };
  try {
    await botAnnounce({ title, body, ...(url ? { url } : {}) });
  } catch (e) {
    return fail(e);
  }
  await audit(admin.email!, "discord.announce", null, null, { title });
  revalidatePath("/admin/discord");
  return { ok: "Annonce publiée dans le salon." };
}

const presence = z.object({
  mode: z.enum(["auto", "custom"]),
  type: z.enum(["watching", "playing", "listening", "competing"]),
  text: z.string().trim().max(100, "Texte : 100 caractères au plus."),
});

export async function setPresenceAction(_prev: BotState, form: FormData): Promise<BotState> {
  const admin = await requireAdmin("discord");
  const parsed = presence.safeParse({ mode: form.get("mode"), type: form.get("type") ?? "watching", text: form.get("text") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  if (parsed.data.mode === "custom" && !parsed.data.text) return { error: "Écris le texte du statut." };
  try {
    await botPresence(parsed.data);
  } catch (e) {
    return fail(e);
  }
  await audit(admin.email!, "discord.presence", null, null, parsed.data);
  revalidatePath("/admin/discord");
  return { ok: parsed.data.mode === "auto" ? "Statut automatique rétabli." : "Statut mis à jour." };
}

export async function toggleAlertsAction(form: FormData) {
  const admin = await requireAdmin("discord");
  const enabled = form.get("enabled") === "1";
  try {
    await botAlerts(enabled);
    await audit(admin.email!, "discord.alerts", null, null, { enabled });
  } catch (e) {
    console.error("discord alerts", e);
  }
  revalidatePath("/admin/discord");
}

export async function postServicesAction(): Promise<BotState> {
  const admin = await requireAdmin("discord");
  try {
    await botPostServices();
  } catch (e) {
    console.error("discord services", e);
    return fail(e);
  }
  await audit(admin.email!, "discord.services_post", null, null, null);
  revalidatePath("/admin/discord");
  return { ok: "État des services publié dans le salon." };
}
