"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/plan-admin";
import { parseChannelLink } from "@/lib/streamers";
import { createAdminClient } from "@/lib/supabase/admin";

// Chaînes de l'accueil : ajout par lien, approbation, retrait. Réservé à la permission « partners » (TOTP vérifié). Chaque action est journalisée.
export type ChannelState = { ok?: string; error?: string };

const refresh = () => {
  revalidatePath("/admin/chaines");
  revalidatePath("/");
};

export async function addChannelAction(_prev: ChannelState, form: FormData): Promise<ChannelState> {
  const admin = await requireAdmin("partners");
  const parsed = parseChannelLink(String(form.get("link") ?? ""));
  if (!parsed) return { error: "Lien non reconnu. Colle un lien de chaîne Twitch (twitch.tv/…)." };
  const { error } = await createAdminClient().from("featured_channels").insert({ platform: parsed.platform, login: parsed.login, approved: true, added_by: admin.email });
  if (error) return { error: error.code === "23505" ? "Cette chaîne est déjà dans la liste." : `Ajout impossible (${error.message}). Migration 0052 appliquée ?` };
  await audit(admin.email!, "channel.add", null, null, parsed);
  refresh();
  return { ok: `Twitch · ${parsed.login} ajoutée à l'accueil.` };
}

export async function toggleChannelAction(form: FormData) {
  const admin = await requireAdmin("partners");
  const id = String(form.get("id") ?? "");
  const approved = form.get("approved") === "true";
  await createAdminClient().from("featured_channels").update({ approved }).eq("id", id);
  await audit(admin.email!, approved ? "channel.approve" : "channel.hide", null, null, { id });
  refresh();
}

export async function removeChannelAction(form: FormData) {
  const admin = await requireAdmin("partners");
  const id = String(form.get("id") ?? "");
  await createAdminClient().from("featured_channels").delete().eq("id", id);
  await audit(admin.email!, "channel.remove", null, null, { id });
  refresh();
}
