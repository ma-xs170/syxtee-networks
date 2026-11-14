import "server-only";
import { pluginUpdate } from "@/emails/templates";
import { publicCoreUrl } from "@/lib/core";
import { sendEmail } from "@/lib/email/send";
import { compareVersions, type PluginLatest } from "@/lib/plugin";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * À chaque nouvelle version du plugin publiée (manifeste du Core), prévient par e-mail les comptes dont au moins un poste est en retard.
 * Un seul e-mail par compte et par version (table plugin_update_notices). Appelé par la tâche quotidienne.
 */
export async function runPluginUpdateNotices() {
  const res = await fetch(`${publicCoreUrl}/v1/plugin/latest`, { cache: "no-store", signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!res?.ok) return { plugin_notified: 0 };
  const latest = (await res.json()) as PluginLatest;
  if (!latest.version) return { plugin_notified: 0 };

  const db = createAdminClient();
  const { data: devices } = await db.from("link_devices").select("user_id, plugin_version").is("revoked_at", null).not("plugin_version", "is", null).limit(5000);
  const late = new Set((devices ?? []).filter((d) => compareVersions(d.plugin_version as string, latest.version) < 0).map((d) => d.user_id as string));
  if (!late.size) return { plugin_notified: 0 };

  const { data: done } = await db.from("plugin_update_notices").select("user_id").eq("version", latest.version).in("user_id", [...late]);
  const already = new Set((done ?? []).map((r) => r.user_id as string));
  let sent = 0;
  for (const id of [...late].filter((u) => !already.has(u)).slice(0, 200)) {
    const { data } = await db.auth.admin.getUserById(id);
    const email = data.user?.email;
    if (!email || email.endsWith("@comptes.syxtee-networks.fr")) continue;
    const r = await sendEmail(email, pluginUpdate({ version: latest.version, notes: latest.notes }));
    if (r === false) continue;
    await db.from("plugin_update_notices").upsert({ user_id: id, version: latest.version });
    sent++;
  }
  return { plugin_notified: sent };
}
