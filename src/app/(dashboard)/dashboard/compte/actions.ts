"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { allow } from "@/lib/auth/rateLimit";
import { MAX_KEYS, MAX_WEBHOOKS, newApiKey, newWebhookSecret, signBody, WEBHOOK_EVENTS, webhookUrlError } from "@/lib/developers";
import { createAdminClient } from "@/lib/supabase/admin";

// Actions de l'onglet Développeurs (Compte). Chaque ligne appartient à l'utilisateur connecté : tout est filtré par son identifiant.

export type DevResult = { error?: string; key?: string };
const back = () => revalidatePath("/dashboard/compte");

export async function createKeyAction(name: string): Promise<DevResult> {
  const user = await requireUser("/dashboard/compte");
  const n = name.trim().slice(0, 40);
  if (!n) return { error: "Donne un nom à la clé." };
  if (!(await allow(`devkey:${user.id}`, 10, 3600))) return { error: "Trop de clés créées. Réessaie plus tard." };
  const db = createAdminClient();
  const { count } = await db.from("api_keys").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("revoked_at", null);
  if ((count ?? 0) >= MAX_KEYS) return { error: `${MAX_KEYS} clés actives au maximum. Révoque-en une.` };
  const k = newApiKey();
  const { error } = await db.from("api_keys").insert({ user_id: user.id, name: n, prefix: k.prefix, key_hash: k.hash });
  if (error) return { error: "Impossible de créer la clé." };
  back();
  return { key: k.key };
}

export async function revokeKeyAction(id: string): Promise<DevResult> {
  const user = await requireUser("/dashboard/compte");
  const { error } = await createAdminClient().from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Impossible de révoquer la clé." };
  back();
  return {};
}

export async function createWebhookAction(url: string): Promise<DevResult> {
  const user = await requireUser("/dashboard/compte");
  const bad = await webhookUrlError(url);
  if (bad) return { error: bad };
  const db = createAdminClient();
  const { count } = await db.from("webhooks").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_WEBHOOKS) return { error: `${MAX_WEBHOOKS} webhooks au maximum.` };
  const { error } = await db.from("webhooks").insert({ user_id: user.id, url: url.trim(), events: [...WEBHOOK_EVENTS], secret: newWebhookSecret() });
  if (error) return { error: "Impossible d'ajouter le webhook." };
  back();
  return {};
}

export async function setWebhookActiveAction(id: string, active: boolean): Promise<DevResult> {
  const user = await requireUser("/dashboard/compte");
  const { error } = await createAdminClient().from("webhooks").update({ active }).eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Impossible de modifier le webhook." };
  back();
  return {};
}

export async function deleteWebhookAction(id: string): Promise<DevResult> {
  const user = await requireUser("/dashboard/compte");
  const { error } = await createAdminClient().from("webhooks").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Impossible de supprimer le webhook." };
  back();
  return {};
}

/** Envoie un évènement « test » signé, pour vérifier l'adresse et la signature. */
export async function testWebhookAction(id: string): Promise<DevResult & { status?: number }> {
  const user = await requireUser("/dashboard/compte");
  if (!(await allow(`devhooktest:${user.id}`, 10, 600))) return { error: "Trop de tests. Réessaie dans quelques minutes." };
  const db = createAdminClient();
  const { data } = await db.from("webhooks").select("url, secret").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) return { error: "Webhook introuvable." };
  const bad = await webhookUrlError(data.url as string);
  if (bad) return { error: bad };
  const body = JSON.stringify({ type: "test", created_at: new Date().toISOString(), data: {} });
  let status = 0;
  try {
    const res = await fetch(data.url as string, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { "content-type": "application/json", "user-agent": "SYXTEE-Webhooks/1", "x-syxtee-event": "test", "x-syxtee-signature": signBody(data.secret as string, body) },
      body,
    });
    status = res.status;
  } catch {
    status = 0;
  }
  await db.from("webhooks").update({ last_at: new Date().toISOString(), last_status: status }).eq("id", id).eq("user_id", user.id);
  back();
  return status >= 200 && status < 300 ? { status } : { error: status ? `Le serveur a répondu ${status}.` : "Pas de réponse (5 s maximum).", status };
}
