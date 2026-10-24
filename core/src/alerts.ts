import type { SupabaseClient } from "@supabase/supabase-js";

// Alertes Discord : un message sur le webhook Discord du compte quand le flux est perdu (puis revenu) et quand le plafond mensuel
// du palier Gratuit approche. Réglages dans `alert_settings` (dashboard, Paramètres › Alertes). Une alerte en panne ne gêne jamais le suivi.

/** Seule adresse acceptée : un webhook Discord (jamais une adresse libre, donc rien d'interne n'est joignable). */
export const DISCORD_RE = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d{15,25}\/[\w-]{20,100}$/;

export type AlertKind = "drop" | "recovered" | "quota80" | "quota100";

type Settings = { discord_url: string | null; on_drop: boolean; on_quota: boolean; quota_notified: string | null };

const COLORS = { warn: 0xe5a00d, ok: 0x2fb344, bad: 0xe03131 } as const;
const go = (bytes: number) => `${(bytes / 1e9).toFixed(bytes >= 10e9 ? 0 : 1).replace(".", ",")} Go`;

/** Texte du message Discord. */
export function alertMessage(kind: AlertKind, v: { offlineS?: number; usedBytes?: number; capBytes?: number } = {}) {
  if (kind === "drop") return { title: "Flux perdu", description: "Plus de signal depuis quelques secondes. Le relais attend le retour de ton téléphone. Si tu as arrêté le direct, ignore ce message.", color: COLORS.warn };
  if (kind === "recovered") return { title: "Flux revenu", description: `Le direct a repris${v.offlineS ? ` après ${Math.max(1, Math.round(v.offlineS))} s` : ""}.`, color: COLORS.ok };
  if (kind === "quota80") return { title: "80 % du plafond mensuel", description: `Tu as diffusé ${go(v.usedBytes ?? 0)} sur ${go(v.capBytes ?? 0)} ce mois-ci. Au plafond, le direct est coupé. Une formule payante n'a pas de plafond.`, color: COLORS.warn };
  return { title: "Plafond mensuel atteint", description: `Les ${go(v.capBytes ?? 0)} du mois sont utilisés : le direct est coupé et reprendra au début du mois prochain, ou tout de suite avec une formule payante.`, color: COLORS.bad };
}

/** Mois civil UTC, comme le calcul du plafond (« 2026-10 »). */
export const monthKey = (now: number) => new Date(now).toISOString().slice(0, 7);

export function createAlerts(opts: { db: SupabaseClient; log?: (m: string) => void; fetchImpl?: typeof fetch; now?: () => number }) {
  const log = opts.log ?? (() => {});
  const doFetch = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  const lastDrop = new Map<string, number>(); // au plus une alerte « flux perdu » toutes les 5 min par compte

  async function settings(userId: string): Promise<Settings | null> {
    const { data, error } = await opts.db.from("alert_settings").select("discord_url, on_drop, on_quota, quota_notified").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Settings | null) ?? null;
  }

  async function send(url: string, m: ReturnType<typeof alertMessage>) {
    const res = await doFetch(url, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { "content-type": "application/json", "user-agent": "SYXTEE-Alerts/1" },
      body: JSON.stringify({ username: "SYXTEE NETWORKS", embeds: [{ title: m.title, description: m.description, color: m.color, timestamp: new Date(now()).toISOString() }] }),
    });
    return res.status;
  }

  async function notify(userId: string, kind: AlertKind, v: Parameters<typeof alertMessage>[1] = {}) {
    try {
      const s = await settings(userId);
      if (!s?.discord_url || !DISCORD_RE.test(s.discord_url)) return false;
      if ((kind === "drop" || kind === "recovered") && !s.on_drop) return false;
      if ((kind === "quota80" || kind === "quota100") && !s.on_quota) return false;
      if (kind === "drop") {
        if (now() - (lastDrop.get(userId) ?? 0) < 300_000) return false;
        lastDrop.set(userId, now());
      }
      const status = await send(s.discord_url, alertMessage(kind, v));
      if (status < 200 || status >= 300) log(`alerte ${kind} : Discord a répondu ${status}`);
      return status >= 200 && status < 300;
    } catch (e) {
      log(`alerte ${kind} : ${(e as Error).message}`);
      return false;
    }
  }

  return {
    notify,
    /** Plafond mensuel : annonce 80 % puis 100 %, une seule fois par seuil et par mois. */
    async quota(userId: string, usedBytes: number, capBytes: number) {
      const level = usedBytes >= capBytes ? 100 : usedBytes >= capBytes * 0.8 ? 80 : 0;
      if (!level) return;
      try {
        const s = await settings(userId);
        const done = s?.quota_notified?.startsWith(`${monthKey(now())}:`) ? Number(s.quota_notified.split(":")[1]) : 0;
        if (!s || done >= level) return;
        if (await notify(userId, level === 100 ? "quota100" : "quota80", { usedBytes, capBytes })) {
          await opts.db.from("alert_settings").update({ quota_notified: `${monthKey(now())}:${level}` }).eq("user_id", userId);
        }
      } catch (e) {
        log(`alerte quota : ${(e as Error).message}`);
      }
    },
  };
}

export type Alerts = ReturnType<typeof createAlerts>;
